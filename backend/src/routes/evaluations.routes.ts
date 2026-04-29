import { Router, type Request, type Response, type NextFunction } from 'express';
import { logAudit } from '../middleware/audit';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createEvaluationSchema,
  listEvaluationsQuerySchema,
  updateEvaluationSchema,
} from '../schemas/evaluation.schema';
import {
  createEvaluation,
  deleteEvaluation,
  getEvaluationById,
  listEvaluations,
  updateEvaluation,
} from '../services/evaluation.service';

const router = Router();

router.use(requireAuth);

// ─── Listar ────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listEvaluationsQuerySchema.parse(req.query);
    const result = await listEvaluations(req.user!, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Detalhe ───────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evaluation = await getEvaluationById(req.params.id, req.user!);
    res.json({ evaluation });
  } catch (err) {
    next(err);
  }
});

// ─── Criar ─────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createEvaluationSchema.parse(req.body);
    const evaluation = await createEvaluation(req.user!.userId, data);

    await logAudit({
      userId: req.user!.userId,
      action: 'evaluation.created',
      entityType: 'evaluation',
      entityId: evaluation.id,
      metadata: {
        technicianId: evaluation.technicianId,
        cycle: evaluation.cycle,
        finalScore: evaluation.finalScore.toString(),
        classification: evaluation.classification,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(201).json({ evaluation });
  } catch (err) {
    next(err);
  }
});

// ─── Editar (apenas autor ou admin) ─────────────────────────
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateEvaluationSchema.parse(req.body);
    const evaluation = await updateEvaluation(req.params.id, req.user!, data);

    await logAudit({
      userId: req.user!.userId,
      action: 'evaluation.updated',
      entityType: 'evaluation',
      entityId: evaluation.id,
      metadata: {
        fields: Object.keys(data),
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.json({ evaluation });
  } catch (err) {
    next(err);
  }
});

// ─── Deletar (super_admin only) ───────────────────────────
router.delete('/:id', requireRole('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteEvaluation(req.params.id);

    await logAudit({
      userId: req.user!.userId,
      action: 'evaluation.deleted',
      entityType: 'evaluation',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
