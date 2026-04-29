import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ConflictError } from '../utils/errors';
import type { ListUsersQuery, UpdateUserInput } from '../schemas/user.schema';

const userSelect = {
  id: true,
  email: true,
  name: true,
  picture: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {};

  if (query.active !== undefined) where.active = query.active;
  if (query.role) where.role = query.role;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function updateUser(
  id: string,
  actingUserId: string,
  input: UpdateUserInput,
) {
  // Trava: super_admin não pode rebaixar a si mesmo nem se desativar (evita lockout)
  if (id === actingUserId) {
    if (input.role !== undefined && input.role !== 'SUPER_ADMIN') {
      throw new ConflictError('Você não pode alterar seu próprio role');
    }
    if (input.active === false) {
      throw new ConflictError('Você não pode desativar sua própria conta');
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      role: input.role,
      active: input.active,
    },
    select: userSelect,
  });
}
