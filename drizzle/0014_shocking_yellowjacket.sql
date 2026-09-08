CREATE TABLE "system_schedule_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_schedule_id" uuid NOT NULL,
	"workspace_id" uuid,
	"status" text DEFAULT 'running' NOT NULL,
	"trigger" text DEFAULT 'scheduled' NOT NULL,
	"result" jsonb,
	"error" text,
	"qstash_message_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" text NOT NULL,
	"job_name" text NOT NULL,
	"cron_config" jsonb DEFAULT '{"cron":"","timezone":"UTC"}'::jsonb NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_llm_prompts" (
	"workspace_id" uuid NOT NULL,
	"prompt_key" text NOT NULL,
	"content" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_llm_prompts_workspace_id_prompt_key_pk" PRIMARY KEY("workspace_id","prompt_key")
);
--> statement-breakpoint
CREATE TABLE "workspace_task_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"triggered_by" uuid,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "system_schedule_runs" ADD CONSTRAINT "system_schedule_runs_system_schedule_id_system_schedules_id_fk" FOREIGN KEY ("system_schedule_id") REFERENCES "public"."system_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_schedule_runs" ADD CONSTRAINT "system_schedule_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_llm_prompts" ADD CONSTRAINT "workspace_llm_prompts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_llm_prompts" ADD CONSTRAINT "workspace_llm_prompts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_task_runs" ADD CONSTRAINT "workspace_task_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_task_runs" ADD CONSTRAINT "workspace_task_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_system_schedule_runs_schedule_started" ON "system_schedule_runs" USING btree ("system_schedule_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_system_schedule_runs_started_at" ON "system_schedule_runs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_system_schedule_runs_status" ON "system_schedule_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_system_schedule_runs_workspace_id" ON "system_schedule_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_system_schedules_schedule_id" ON "system_schedules" USING btree ("schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_system_schedules_job_name" ON "system_schedules" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "idx_system_schedules_enabled" ON "system_schedules" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_workspace_llm_prompts_workspace_id" ON "workspace_llm_prompts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_task_runs_workspace_started" ON "workspace_task_runs" USING btree ("workspace_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_workspace_task_runs_workspace_status" ON "workspace_task_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_workspace_task_runs_task_type_started" ON "workspace_task_runs" USING btree ("task_type","started_at" DESC NULLS LAST);