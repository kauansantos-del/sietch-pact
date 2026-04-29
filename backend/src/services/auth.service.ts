import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { UserRole } from '@prisma/client';
import { env, isProduction } from '../config/env';
import { googleClient } from '../config/google';
import { prisma } from '../config/prisma';
import { ForbiddenError, UnauthenticatedError } from '../utils/errors';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: UserRole;
}

/**
 * Troca o `code` do Google por tokens, valida o id_token (assinatura, audience,
 * expiração, hd e email_verified) e faz upsert do usuário no banco.
 */
export async function authenticateWithGoogleCode(code: string): Promise<AuthenticatedUser> {
  // 1. code → tokens
  const { tokens } = await googleClient.getToken(code);

  if (!tokens.id_token) {
    throw new UnauthenticatedError('Resposta do Google sem id_token');
  }

  // 2. Verifica id_token assinado pelo Google (audience + expiração)
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new UnauthenticatedError('id_token inválido');
  }

  // 3. Validações críticas (defesa em profundidade)
  if (!payload.email_verified) {
    throw new ForbiddenError('FORBIDDEN_DOMAIN', 'Email não verificado pelo Google');
  }

  const emailDomain   = payload.email.toLowerCase().split('@')[1];
  const allowedDomain = env.ALLOWED_EMAIL_DOMAIN.toLowerCase();

  if (emailDomain !== allowedDomain) {
    throw new ForbiddenError(
      'FORBIDDEN_DOMAIN',
      `Acesso restrito a contas @${env.ALLOWED_EMAIL_DOMAIN}`,
    );
  }

  // payload.hd só existe em contas Google Workspace — contas pessoais (@gmail.com)
  // não preenchem esse campo, portanto só verificamos o hd para domínios corporativos.
  if (allowedDomain !== 'gmail.com' && payload.hd !== env.ALLOWED_EMAIL_DOMAIN) {
    throw new ForbiddenError(
      'FORBIDDEN_DOMAIN',
      `Acesso restrito a contas @${env.ALLOWED_EMAIL_DOMAIN}`,
    );
  }

  // 4. Upsert — cria ou atualiza o usuário
  const isInitialAdmin =
    !!env.INITIAL_ADMIN_EMAIL &&
    payload.email.toLowerCase() === env.INITIAL_ADMIN_EMAIL.toLowerCase();

  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    create: {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name ?? payload.email.split('@')[0],
      picture: payload.picture ?? null,
      role: isInitialAdmin ? 'SUPER_ADMIN' : 'ADMIN',
      lastLoginAt: new Date(),
    },
    update: {
      email: payload.email.toLowerCase(),
      name: payload.name ?? undefined,
      picture: payload.picture ?? undefined,
      lastLoginAt: new Date(),
      // Se o initial admin logar e por algum motivo perdeu role admin, reaplica
      ...(isInitialAdmin && { role: 'SUPER_ADMIN' as UserRole }),
    },
  });

  if (!user.active) {
    throw new ForbiddenError('USER_INACTIVE', 'Sua conta foi desativada');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role,
  };
}

/**
 * Emite o JWT de sessão da PACT (NÃO usa o id_token do Google).
 * Permite controle independente de expiração e revogação.
 */
export function signSessionToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: `${env.SESSION_MAX_AGE_DAYS}d` },
  );
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-origin fetch between frontend/backend on different *.vercel.app domains
    // requires sameSite:'none' so credentials:'include' works
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

/**
 * Cookie temporário para o `state` do OAuth (CSRF protection).
 * Curta duração (10min) e mesma flag de segurança da sessão.
 */
export function oauthStateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  };
}
