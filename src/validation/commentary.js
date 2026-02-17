import { z } from 'zod';

export const listCommentaryQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
    minute: z.number().int().nonnegative(),
    sequence: z.number().int().optional(),
    period: z.string().optional(),
    event_type: z.string().optional(),
    actor: z.string().optional(),
    team: z.string().nullable().optional(),
    message: z.string().min(1),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
});