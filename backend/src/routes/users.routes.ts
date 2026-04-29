import { Router, type Request, type Response, type NextFunction } from 'express';
import { logAudit } from '../middleware/audit';
import { requireAuth, requireRole } from '../middleware/auth';
import { listUsersQuerySchema, updateUserSchema } from '../schemas/user.schema';
import { listUsers, updateUser } from '../services/user.service';

const router = Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await listUsers(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await updateUser(req.params.id, req.user!.userId, data);

    await logAudit({
      userId: req.user!.userId,
      action: 'user.updated',
      entityType: 'user',
      entityId: user.id,
      metadata: { fields: Object.keys(data), targetEmail: user.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
