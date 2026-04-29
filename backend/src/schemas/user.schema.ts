import { z } from 'zod';

export const updateUserSchema = z
  .object({
    role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.active !== undefined, {
    message: 'Informe ao menos um campo: role ou active',
  });

export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
  active: z
    .enum(['true', 'false', 'all'])
    .default('all')
    .transform((v) => (v === 'all' ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
