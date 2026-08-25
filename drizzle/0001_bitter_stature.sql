CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"result" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"job_type" text NOT NULL,
	"cron_config" jsonb DEFAULT '{"cron":"","timezone":"UTC"}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_runs_job_id" ON "job_runs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_runs_started_at" ON "job_runs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_job_runs_status" ON "job_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_runs_job_started" ON "job_runs" USING btree ("job_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_jobs_workspace_name" ON "jobs" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_jobs_workspace_id" ON "jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_enabled" ON "jobs" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_jobs_job_type" ON "jobs" USING btree ("job_type");