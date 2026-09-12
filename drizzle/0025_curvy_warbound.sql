CREATE TABLE "term_group_member_rebuild_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"term_group_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"model" text NOT NULL,
	"include_already_members" boolean DEFAULT false NOT NULL,
	"remove_non_matching" boolean DEFAULT false NOT NULL,
	"enable_web_research" boolean DEFAULT true NOT NULL,
	"confidence_min" real NOT NULL,
	"estimate" jsonb NOT NULL,
	"result" jsonb DEFAULT '{"termsScanned":0,"termsMatched":0,"termsRemoved":0,"webQueries":0,"inputTokens":0,"outputTokens":0,"costUsd":0,"cursor":null}'::jsonb NOT NULL,
	"error" text,
	"triggered_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "term_groups" ADD COLUMN "active_member_rebuild_run_id" uuid;--> statement-breakpoint
ALTER TABLE "term_group_member_rebuild_runs" ADD CONSTRAINT "term_group_member_rebuild_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_group_member_rebuild_runs" ADD CONSTRAINT "term_group_member_rebuild_runs_term_group_id_term_groups_id_fk" FOREIGN KEY ("term_group_id") REFERENCES "public"."term_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_group_member_rebuild_runs" ADD CONSTRAINT "term_group_member_rebuild_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_term_group_member_rebuild_runs_group_started" ON "term_group_member_rebuild_runs" USING btree ("term_group_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_term_group_member_rebuild_runs_workspace_started" ON "term_group_member_rebuild_runs" USING btree ("workspace_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_term_group_member_rebuild_one_active" ON "term_group_member_rebuild_runs" USING btree ("term_group_id") WHERE "term_group_member_rebuild_runs"."status" IN ('pending', 'running');--> statement-breakpoint
CREATE INDEX "idx_term_groups_active_member_rebuild_run" ON "term_groups" USING btree ("active_member_rebuild_run_id");