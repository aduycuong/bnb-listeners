CREATE TABLE "ai_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"period_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"complete" boolean NOT NULL,
	"metrics" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"trigger" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_reports_period_key" UNIQUE("project_id","period_type","period_start")
);
--> statement-breakpoint
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;