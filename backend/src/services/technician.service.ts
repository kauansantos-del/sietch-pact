import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import type {
  CreateTechnicianInput,
  ListTechniciansQuery,
  UpdateTechnicianInput,
} from '../schemas/technician.schema';

export async function listTechnicians(query: ListTechniciansQuery) {
  const where: Prisma.TechnicianWhereInput = {};

  if (query.active !== undefined) where.active = query.active;
  if (query.team) where.team = query.team;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { team: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.technician.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.technician.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getTechnicianById(id: string) {
  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) throw new NotFoundError('Técnico não encontrado');
  return tech;
}

export async function createTechnician(input: CreateTechnicianInput) {
  return prisma.technician.create({
    data: {
      name: input.name,
      email: input.email,
      team: input.team,
    },
  });
}

export async function updateTechnician(id: string, input: UpdateTechnicianInput) {
  return prisma.technician.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      team: input.team,
      active: input.active,
    },
  });
}

/**
 * Soft delete — marca como inativo. Preserva histórico de avaliações.
 */
export async function deactivateTechnician(id: string) {
  return prisma.technician.update({
    where: { id },
    data: { active: false },
  });
}
