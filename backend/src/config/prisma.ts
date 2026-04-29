import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';

// Reuso de instância em hot-reload (dev) e em invocações warm da Vercel.
// Em serverless, cada cold start cria 1 cliente; warms reusam o singleton.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (!isProduction) globalThis.__prisma = prisma;
