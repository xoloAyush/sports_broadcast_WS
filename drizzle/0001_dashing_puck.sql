ALTER TABLE "commentary" RENAME COLUMN "sequence_no" TO "sequence";--> statement-breakpoint
ALTER TABLE "commentary" DROP CONSTRAINT "commentary_match_id_matches_id_fk";
--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "period" text;--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "team" text;--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "commentary" ADD CONSTRAINT "commentary_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentary" DROP COLUMN "details";