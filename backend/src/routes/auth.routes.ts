import crypto from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { env } from '../config/env';
import { buildGoogleAuthUrl } from '../config/google';
import { prisma } from '../config/prisma';
import { logAudit } from '../middleware/audit';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../utils/errors';
import {
  authenticateWithGoogleCode,
  oauthStateCookieOptions,
  sessionCookieOptions,
  signSessionToken,
} from '../services/auth.service';

const router = Router();

const STATE_COOKIE = 'pact_oauth_state';

// ─── 1. Inicia o fluxo OAuth ─────────────────────────────────
router.get('/google', (req: Request, res: Response) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(STATE_COOKIE, state, oauthStateCookieOptions());
  res.redirect(buildGoogleAuthUrl({ state }));
});

// ─── 2. Callback ────────────────────────────────────────────
router.get('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, error } = req.query;
    const expectedState = req.cookies[STATE_COOKIE];

    // Sempre limpamos o cookie de state — usa-se uma única vez
    res.clearCookie(STATE_COOKIE, { path: '/' });

    if (error) {
      return res.redirect(`${env.FRONTEND_URL}/?auth_error=${encodeURIComponent(String(error))}`);
    }

    // CSRF — state precisa bater com o cookie
    if (typeof state !== 'string' || !expectedState || state !== expectedState) {
      return res.redirect(`${env.FRONTEND_URL}/?auth_error=invalid_state`);
    }

    if (typeof code !== 'string' || !code) {
      return res.redirect(`${env.FRONTEND_URL}/?auth_error=missing_code`);
    }

    let user;
    try {
      user = await authenticateWithGoogleCode(code);
    } catch (err: any) {
      // Em vez de 401/403 puro, redirecionamos para o front com motivo legível
      const code = err?.code === 'FORBIDDEN_DOMAIN' ? 'forbidden_domain'
        : err?.code === 'USER_INACTIVE' ? 'user_inactive'
        : 'auth_failed';
      return res.redirect(`${env.FRONTEND_URL}/?auth_error=${code}`);
    }

    // Auditoria do login
    await logAudit({
      userId: user.id,
      action: 'user.login',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    // Emite o JWT próprio em cookie httpOnly
    const token = signSessionToken(user);
    res.cookie(env.SESSION_COOKIE_NAME, token, sessionCookieOptions());

    return res.redirect(env.FRONTEND_URL);
  } catch (err) {
    return next(err);
  }
});

// ─── 3. Usuário atual ───────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        role: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new NotFoundError('Usuário não encontrado');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ─── 4. Logout ──────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await logAudit({
      userId: req.user!.userId,
      action: 'user.logout',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
    res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── 5. Bypass temporário (sem Google OAuth) ────────────────
// Remove quando o redirect URI do Google Console estiver configurado.
router.post('/bypass', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (env.INITIAL_ADMIN_EMAIL ?? 'admin@pact.internal').toLowerCase();

    let user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: `bypass_${Date.now()}`,
          email,
          name: 'Admin PACT',
          role: 'SUPER_ADMIN',
          active: true,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    if (!user.active) {
      return res.status(403).json({ error: { code: 'USER_INACTIVE', message: 'Conta desativada' } });
    }

    const authUser = { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role };
    const token = signSessionToken(authUser);
    res.cookie(env.SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return res.json({ ok: true, user: authUser });
  } catch (err) {
    return next(err);
  }
});

export default router;
