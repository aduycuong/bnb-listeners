CREATE TABLE "topic_backfill_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"new_listening_started_at" timestamp with time zone NOT NULL,
	"scan_end_at" timestamp with time zone NOT NULL,
	"model" text NOT NULL,
	"quality_min" real NOT NULL,
	"confidence_min" real NOT NULL,
	"estimate" jsonb NOT NULL,
	"result" jsonb DEFAULT '{"documentsScanned":0,"documentsMatched":0,"documentsSkipped":0,"inputTokens":0,"outputTokens":0,"costUsd":0,"cursor":null}'::jsonb NOT NULL,
	"error" text,
	"triggered_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "listening_started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "active_backfill_run_id" uuid;--> statement-breakpoint
ALTER TABLE "topic_backfill_runs" ADD CONSTRAINT "topic_backfill_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_backfill_runs" ADD CONSTRAINT "topic_backfill_runs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_backfill_runs" ADD CONSTRAINT "topic_backfill_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_topic_backfill_runs_topic_started" ON "topic_backfill_runs" USING btree ("topic_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_topic_backfill_runs_workspace_started" ON "topic_backfill_runs" USING btree ("workspace_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_topic_backfill_one_active" ON "topic_backfill_runs" USING btree ("topic_id") WHERE "topic_backfill_runs"."status" IN ('pending', 'running');--> statement-breakpoint
CREATE INDEX "idx_documents_backfill_scan" ON "documents" USING btree ("workspace_id","published_at","id") WHERE "documents"."is_duplicate" = false AND "documents"."published_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_topics_active_backfill_run" ON "topics" USING btree ("active_backfill_run_id");