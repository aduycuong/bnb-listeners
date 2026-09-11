CREATE TABLE "document_terms" (
	"document_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"assigned_by" text DEFAULT 'llm_classifier' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_terms_document_id_term_id_pk" PRIMARY KEY("document_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "term_backfill_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"new_listening_started_at" timestamp with time zone NOT NULL,
	"scan_end_at" timestamp with time zone NOT NULL,
	"model" text NOT NULL,
	"quality_min" real NOT NULL,
	"include_already_assigned" boolean DEFAULT false NOT NULL,
	"confidence_min" real NOT NULL,
	"estimate" jsonb NOT NULL,
	"result" jsonb DEFAULT '{"documentsScanned":0,"documentsMatched":0,"documentsSkipped":0,"inputTokens":0,"outputTokens":0,"costUsd":0,"cursor":null}'::jsonb NOT NULL,
	"error" text,
	"triggered_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "term_digest_daily" (
	"term_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"job_id" uuid NOT NULL,
	"doc_count" integer DEFAULT 0 NOT NULL,
	"avg_quality_score" real,
	"trend_score" real,
	"is_stale" boolean DEFAULT true NOT NULL,
	"is_bulk_stale" boolean DEFAULT false NOT NULL,
	"stale_since" timestamp with time zone,
	"processing" boolean DEFAULT false NOT NULL,
	"processing_started_at" timestamp with time zone,
	"computed_at" timestamp with time zone,
	CONSTRAINT "term_digest_daily_term_id_date_key_job_id_pk" PRIMARY KEY("term_id","date_key","job_id")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text DEFAULT 'admin' NOT NULL,
	"source_document_id" uuid,
	"listening_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active_backfill_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_topics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "topic_backfill_runs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "topics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "document_topics" CASCADE;--> statement-breakpoint
DROP TABLE "topic_backfill_runs" CASCADE;--> statement-breakpoint
DROP TABLE "topic_digest_daily" CASCADE;--> statement-breakpoint
DROP TABLE "topics" CASCADE;--> statement-breakpoint
DROP INDEX "idx_chunks_topic_ids";--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "term_ids" uuid[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "auto_create_terms" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "term_language" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "term_criteria" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_terms" ADD CONSTRAINT "document_terms_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_terms" ADD CONSTRAINT "document_terms_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_backfill_runs" ADD CONSTRAINT "term_backfill_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_backfill_runs" ADD CONSTRAINT "term_backfill_runs_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_backfill_runs" ADD CONSTRAINT "term_backfill_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_digest_daily" ADD CONSTRAINT "term_digest_daily_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_digest_daily" ADD CONSTRAINT "term_digest_daily_date_key_dim_dates_date_key_fk" FOREIGN KEY ("date_key") REFERENCES "public"."dim_dates"("date_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_digest_daily" ADD CONSTRAINT "term_digest_daily_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_document_terms_term" ON "document_terms" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_document_terms_document" ON "document_terms" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_term_backfill_runs_term_started" ON "term_backfill_runs" USING btree ("term_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_term_backfill_runs_workspace_started" ON "term_backfill_runs" USING btree ("workspace_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_term_backfill_one_active" ON "term_backfill_runs" USING btree ("term_id") WHERE "term_backfill_runs"."status" IN ('pending', 'running');--> statement-breakpoint
CREATE INDEX "idx_term_digest_daily_job_date" ON "term_digest_daily" USING btree ("job_id","date_key","term_id");--> statement-breakpoint
CREATE INDEX "idx_term_digest_daily_date" ON "term_digest_daily" USING btree ("date_key","term_id");--> statement-breakpoint
CREATE INDEX "idx_term_digest_daily_stale" ON "term_digest_daily" USING btree ("stale_since") WHERE "term_digest_daily"."is_stale" = true AND "term_digest_daily"."is_bulk_stale" = false AND "term_digest_daily"."processing" = false;--> statement-breakpoint
CREATE INDEX "idx_term_digest_daily_bulk_stale" ON "term_digest_daily" USING btree ("stale_since") WHERE "term_digest_daily"."is_stale" = true AND "term_digest_daily"."is_bulk_stale" = true AND "term_digest_daily"."processing" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_terms_workspace_name" ON "terms" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_terms_workspace_id" ON "terms" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_terms_source_document" ON "terms" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "idx_terms_active_backfill_run" ON "terms" USING btree ("active_backfill_run_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_term_ids" ON "chunks" USING gin ("term_ids");--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "topic_ids";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "auto_create_topics";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "topic_language";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "topic_criteria";