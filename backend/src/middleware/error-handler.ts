import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { isProduction } from '../config/env';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. AppError — erros conhecidos com código + status
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    } satisfies ApiErrorBody);
    return;
  }

  // 2. Zod — payload inválido
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload inválido',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
    } satisfies ApiErrorBody);
    return;
  }

  // 3. Prisma — violations conhecidas (ex: unique constraint)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Recurso já existe',
          details: { fields: err.meta?.target },
        },
      } satisfies ApiErrorBody);
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Recurso não encontrado' },
      } satisfies ApiErrorBody);
      return;
    }
  }

  // 4. Erro genérico — log completo no servidor, resposta opaca pro cliente
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.userId,
    },
    'Erro não tratado',
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Erro interno do servidor' : (err as Error)?.message ?? 'Erro desconhecido',
    },
  } satisfies ApiErrorBody);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Rota não encontrada' },
  } satisfies ApiErrorBody);
}
