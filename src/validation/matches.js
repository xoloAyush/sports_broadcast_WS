import { z } from "zod";

/**
 * DB Enum mirror
 */
export const MATCH_STATUS = {
    SCHEDULED: "scheduled",
    LIVE: "live",
    FINISHED: "finished",
};

export const matchStatusEnum = z.enum([
    MATCH_STATUS.SCHEDULED,
    MATCH_STATUS.LIVE,
    MATCH_STATUS.FINISHED,
]);

/* ----------------------------------------
   Create Match
   POST /matches
----------------------------------------- */
export const createMatchSchema = z
    .object({
        homeTeam: z.string().min(2).max(100),
        awayTeam: z.string().min(2).max(100),

        sport: z.string().min(2).max(50),

        startTime: z.string().datetime(),
        endTime: z.string().datetime(),

        status: matchStatusEnum.optional(),

        homeScore: z.number().int().min(0).optional(),
        awayScore: z.number().int().min(0).optional(),
    })
    .refine(
        (data) => new Date(data.endTime) > new Date(data.startTime),
        {
            message: "endTime must be after startTime",
            path: ["endTime"],
        }
    );

/* ----------------------------------------
   List Matches
   GET /matches
----------------------------------------- */
export const listMatchesQuerySchema = z.object({
    status: matchStatusEnum.optional(),
    sport: z.string().min(2).max(50).optional(),

    from: z.string().datetime().optional(), // startTime >= from
    to: z.string().datetime().optional(),   // endTime <= to

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* ----------------------------------------
   Match ID Params
   /matches/:id
----------------------------------------- */
export const matchIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/* ----------------------------------------
   Update Match (General)
   PATCH /matches/:id
----------------------------------------- */
export const updateMatchSchema = z
    .object({
        homeTeam: z.string().min(2).max(100).optional(),
        awayTeam: z.string().min(2).max(100).optional(),

        sport: z.string().min(2).max(50).optional(),

        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),

        status: matchStatusEnum.optional(),
    })
    .refine(
        (data) =>
            !data.startTime ||
            !data.endTime ||
            new Date(data.endTime) > new Date(data.startTime),
        {
            message: "endTime must be after startTime",
            path: ["endTime"],
        }
    );

/* ----------------------------------------
   Update Score
   PATCH /matches/:id/score
----------------------------------------- */
export const updateScoreSchema = z.object({
    homeScore: z.number().int().min(0),
    awayScore: z.number().int().min(0),
});
