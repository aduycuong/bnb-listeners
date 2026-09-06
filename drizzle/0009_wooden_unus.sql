DROP TABLE IF EXISTS "topic_digest_rollup" CASCADE;--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_group_id_source_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_group_id_source_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ALTER COLUMN "group_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_group_id_source_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."source_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_group_id_source_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."source_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD CONSTRAINT "topic_digest_daily_group_id_source_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."source_groups"("id") ON DELETE cascade ON UPDATE no action;