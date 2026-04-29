import { Router, type Request, type Response, type NextFunction } from 'express';
import { logAudit } from '../middleware/audit';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createTechnicianSchema,
  listTechniciansQuerySchema,
  updateTechnicianSchema,
} from '../schemas/technician.schema';
import {
  createTechnician,
  deactivateTechnician,
  getTechnicianById,
  listTechnicians,
  updateTechnician,
} from '../services/technician.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listTechniciansQuerySchema.parse(req.query);
    const result = await listTechnicians(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const technician = await getTechnicianById(req.params.id);
    res.json({ technician });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTechnicianSchema.parse(req.body);
    const technician = await createTechnician(data);

    await logAudit({
      userId: req.user!.userId,
      action: 'technician.created',
      entityType: 'technician',
      entityId: technician.id,
      metadata: { name: technician.name, team: technician.team },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(201).json({ technician });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateTechnicianSchema.parse(req.body);
    const technician = await updateTechnician(req.params.id, data);

    await logAudit({
      userId: req.user!.userId,
      action: 'technician.updated',
      entityType: 'technician',
      entityId: technician.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.json({ technician });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const technician = await deactivateTechnician(req.params.id);

    await logAudit({
      userId: req.user!.userId,
      action: 'technician.deactivated',
      entityType: 'technician',
      entityId: technician.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
