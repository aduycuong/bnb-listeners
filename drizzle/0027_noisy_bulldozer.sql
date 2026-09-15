ALTER TABLE "jobs" RENAME TO "data_sources";--> statement-breakpoint
ALTER TABLE "job_runs" RENAME TO "source_runs";--> statement-breakpoint
ALTER TABLE "comments" RENAME COLUMN "source_id" TO "source_item_id";--> statement-breakpoint
ALTER TABLE "documents" RENAME COLUMN "source_key" TO "source_origin_key";--> statement-breakpoint
ALTER TABLE "documents" RENAME COLUMN "source_name" TO "source_origin_name";--> statement-breakpoint
ALTER TABLE "documents" RENAME COLUMN "source_id" TO "source_item_id";--> statement-breakpoint
ALTER TABLE "documents" RENAME COLUMN "job_run_id" TO "source_run_id";--> statement-breakpoint
ALTER TABLE "documents" RENAME COLUMN "job_id" TO "data_source_id";--> statement-breakpoint
ALTER TABLE "source_runs" RENAME COLUMN "job_id" TO "data_source_id";--> statement-breakpoint
ALTER TABLE "data_sources" RENAME COLUMN "job_type" TO "source_type";--> statement-breakpoint
ALTER TABLE "term_digest_daily" RENAME COLUMN "job_id" TO "data_source_id";--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_job_run_id_job_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "source_runs" DROP CONSTRAINT "job_runs_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "data_sources" DROP CONSTRAINT "jobs_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "term_digest_daily" DROP CONSTRAINT "term_digest_daily_job_id_jobs_id_fk";
--> statement-breakpoint
DROP INDEX "idx_comments_document_source";--> statement-breakpoint
DROP INDEX "idx_documents_source_key";--> statement-breakpoint
DROP INDEX "idx_documents_job_run_id";--> statement-breakpoint
DROP INDEX "idx_documents_job_id";--> statement-breakpoint
DROP INDEX "idx_documents_workspace_job";--> statement-breakpoint
DROP INDEX "idx_job_runs_job_id";--> statement-breakpoint
DROP INDEX "idx_job_runs_started_at";--> statement-breakpoint
DROP INDEX "idx_job_runs_status";--> statement-breakpoint
DROP INDEX "idx_job_runs_job_started";--> statement-breakpoint
DROP INDEX "idx_job_runs_run_type";--> statement-breakpoint
DROP INDEX "idx_jobs_workspace_name";--> statement-breakpoint
DROP INDEX "idx_jobs_workspace_id";--> statement-breakpoint
DROP INDEX "idx_jobs_enabled";--> statement-breakpoint
DROP INDEX "idx_jobs_job_type";--> statement-breakpoint
DROP INDEX "idx_term_digest_daily_job_date";--> statement-breakpoint
DROP INDEX "idx_documents_workspace_source";--> statement-breakpoint
ALTER TABLE "term_digest_daily" DROP CONSTRAINT "term_digest_daily_term_id_date_key_job_id_pk";--> statement-breakpoint
ALTER TABLE "term_digest_daily" ADD CONSTRAINT "term_digest_daily_term_id_date_key_data_source_id_pk" PRIMARY KEY("term_id","date_key","data_source_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_run_id_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."source_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_digest_daily" ADD CONSTRAINT "term_digest_daily_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_comments_document_source_item" ON "comments" USING btree ("document_id","source_item_id");--> statement-breakpoint
CREATE INDEX "idx_documents_source_origin_key" ON "documents" USING btree ("doc_type","source_origin_key");--> statement-breakpoint
CREATE INDEX "idx_documents_source_run_id" ON "documents" USING btree ("source_run_id");--> statement-breakpoint
CREATE INDEX "idx_documents_data_source_id" ON "documents" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "idx_documents_workspace_data_source" ON "documents" USING btree ("workspace_id","data_source_id");--> statement-breakpoint
CREATE INDEX "idx_source_runs_data_source_id" ON "source_runs" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "idx_source_runs_started_at" ON "source_runs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_source_runs_status" ON "source_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_source_runs_data_source_started" ON "source_runs" USING btree ("data_source_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_source_runs_run_type" ON "source_runs" USING btree ("run_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_data_sources_workspace_name" ON "data_sources" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_data_sources_workspace_id" ON "data_sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_data_sources_enabled" ON "data_sources" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_data_sources_source_type" ON "data_sources" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_term_digest_daily_data_source_date" ON "term_digest_daily" USING btree ("data_source_id","date_key","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_documents_workspace_source" ON "documents" USING btree ("workspace_id","doc_type","source_origin_key","source_item_id");