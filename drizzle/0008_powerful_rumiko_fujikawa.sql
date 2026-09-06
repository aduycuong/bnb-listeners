CREATE TABLE "source_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_topic_digest_rollup_grain_period";--> statement-breakpoint
ALTER TABLE "topic_digest_daily" DROP CONSTRAINT "topic_digest_daily_topic_id_date_key_pk";--> statement-breakpoint
ALTER TABLE "topic_digest_rollup" DROP CONSTRAINT "topic_digest_rollup_topic_id_period_grain_period_start_pk";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD COLUMN "group_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_digest_rollup" ADD COLUMN "group_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD CONSTRAINT "topic_digest_daily_topic_id_date_key_group_id_pk" PRIMARY KEY("topic_id","date_key","group_id");--> statement-breakpoint
ALTER TABLE "topic_digest_rollup" ADD CONSTRAINT "topic_digest_rollup_topic_id_period_grain_period_start_group_id_pk" PRIMARY KEY("topic_id","period_grain","period_start","group_id");--> statement-breakpoint
ALTER TABLE "source_groups" ADD CONSTRAINT "source_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_source_groups_workspace_name" ON "source_groups" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_source_groups_workspace_id" ON "source_groups" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_group_id_source_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."source_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_group_id_source_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."source_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_workspace_group" ON "documents" USING btree ("workspace_id","group_id");--> statement-breakpoint
CREATE INDEX "idx_topic_digest_daily_group_date" ON "topic_digest_daily" USING btree ("group_id","date_key","topic_id");--> statement-breakpoint
CREATE INDEX "idx_topic_digest_rollup_group_grain_period" ON "topic_digest_rollup" USING btree ("group_id","period_grain","period_start","trend_score" DESC NULLS LAST);
