ALTER TABLE "source_groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "source_groups" CASCADE;--> statement-breakpoint
DROP INDEX "idx_documents_workspace_group";--> statement-breakpoint
DROP INDEX "idx_topic_digest_daily_group_date";--> statement-breakpoint
ALTER TABLE "topic_digest_daily" DROP CONSTRAINT "topic_digest_daily_topic_id_date_key_group_id_pk";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "job_id" uuid;--> statement-breakpoint
UPDATE "documents" AS d SET "job_id" = jr."job_id" FROM "job_runs" AS jr WHERE d."job_run_id" = jr."id";--> statement-breakpoint
DELETE FROM "documents" WHERE "job_id" IS NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "job_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD COLUMN "job_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD CONSTRAINT "topic_digest_daily_topic_id_date_key_job_id_pk" PRIMARY KEY("topic_id","date_key","job_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD CONSTRAINT "topic_digest_daily_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_job_id" ON "documents" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_documents_workspace_job" ON "documents" USING btree ("workspace_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_topic_digest_daily_job_date" ON "topic_digest_daily" USING btree ("job_id","date_key","topic_id");--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "group_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "group_id";--> statement-breakpoint
ALTER TABLE "topic_digest_daily" DROP COLUMN "group_id";
