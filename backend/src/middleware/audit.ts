import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export interface AuditEvent {
  userId?: string | null;
  action: string; // ex: "user.login", "evaluation.created"
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Persiste um evento de auditoria. Falhas no log NUNCA bloqueiam a request principal —
 * apenas registramos o erro localmente e seguimos.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: event.userId ?? null,
        action: event.action,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        metadata: event.metadata,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: event.action }, 'Falha ao gravar audit log');
  }
}
