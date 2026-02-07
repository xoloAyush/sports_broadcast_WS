import {
    pgTable,
    serial,
    text,
    timestamp,
    integer,
    varchar,
    pgEnum,
    jsonb
} from "drizzle-orm/pg-core";

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

export const matches = pgTable("matches", {
    id: serial("id").primaryKey(),

    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),

    sport: varchar("sport", { length: 50 }).notNull(),

    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),

    status: matchStatusEnum('status').notNull().default('scheduled'),

    homeScore: integer("home_score").default(0),
    awayScore: integer("away_score").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentary = pgTable("commentary", {
    id: serial("id").primaryKey(),

    matchId: integer("match_id")
        .notNull()
        .references(() => matches.id, { onDelete: "cascade" }),

    actor: text("actor"), // who (player, referee, system, commentator)

    message: text("message").notNull(), // what happened

    minute: integer("minute"), // when (e.g. 45, 90+2)

    sequenceNo: integer("sequence_no").notNull(), // strict ordering

    details: jsonb("details"), // "anything bucket"

    createdAt: timestamp("created_at").defaultNow().notNull(),
});