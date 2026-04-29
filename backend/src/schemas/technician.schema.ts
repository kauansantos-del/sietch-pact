import { z } from 'zod';

export const createTechnicianSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().toLowerCase().optional().or(z.literal('').transform(() => undefined)),
  team: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
});

export const updateTechnicianSchema = createTechnicianSchema.partial().extend({
  active: z.boolean().optional(),
});

export const listTechniciansQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(), // busca por nome/team
  team: z.string().trim().max(80).optional(),
  active: z
    .enum(['true', 'false', 'all'])
    .default('true')
    .transform((v) => (v === 'all' ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>;
export type UpdateTechnicianInput = z.infer<typeof updateTechnicianSchema>;
export type ListTechniciansQuery = z.infer<typeof listTechniciansQuerySchema>;
