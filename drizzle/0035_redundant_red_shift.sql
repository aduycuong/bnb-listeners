ALTER TABLE "research_runs" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "clarification_mode" text DEFAULT 'ask' NOT NULL;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "clarifications" jsonb;