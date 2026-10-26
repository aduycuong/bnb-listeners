CREATE TABLE "project_aspect_daily" (
	"project_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"aspect_id" uuid NOT NULL,
	"mentions" integer DEFAULT 0 NOT NULL,
	"positive" integer DEFAULT 0 NOT NULL,
	"neutral" integer DEFAULT 0 NOT NULL,
	"negative" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_aspect_daily_key" UNIQUE("project_id","date_key","aspect_id")
);
--> statement-breakpoint
CREATE TABLE "project_metrics_daily" (
	"project_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"source_id" uuid,
	"mentions" integer DEFAULT 0 NOT NULL,
	"posts" integer DEFAULT 0 NOT NULL,
	"engagement" integer DEFAULT 0 NOT NULL,
	"positive" integer DEFAULT 0 NOT NULL,
	"neutral" integer DEFAULT 0 NOT NULL,
	"negative" integer DEFAULT 0 NOT NULL,
	"unknown" integer DEFAULT 0 NOT NULL,
	"emotions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sov_primary" integer DEFAULT 0 NOT NULL,
	"sov_tracked" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_metrics_daily_key" UNIQUE NULLS NOT DISTINCT("project_id","date_key","source_id")
);
--> statement-breakpoint
ALTER TABLE "project_aspect_daily" ADD CONSTRAINT "project_aspect_daily_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_aspect_daily" ADD CONSTRAINT "project_aspect_daily_aspect_id_project_aspects_id_fk" FOREIGN KEY ("aspect_id") REFERENCES "public"."project_aspects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metrics_daily" ADD CONSTRAINT "project_metrics_daily_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_metrics_daily" ADD CONSTRAINT "project_metrics_daily_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;