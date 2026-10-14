CREATE TABLE "project_aspects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"entity_id" uuid,
	"include" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"with_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclude" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proximity" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_sources" (
	"project_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_sources_project_id_source_id_pk" PRIMARY KEY("project_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "case" SET DEFAULT 'project';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mode" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "config_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "case_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_aspects" ADD CONSTRAINT "project_aspects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_entities" ADD CONSTRAINT "project_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_queries" ADD CONSTRAINT "project_queries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_queries" ADD CONSTRAINT "project_queries_entity_id_project_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."project_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sources" ADD CONSTRAINT "project_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sources" ADD CONSTRAINT "project_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_aspects_project_key_idx" ON "project_aspects" USING btree ("project_id","key");--> statement-breakpoint
CREATE INDEX "project_entities_project_id_idx" ON "project_entities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_queries_project_id_idx" ON "project_queries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_queries_entity_id_idx" ON "project_queries" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "project_sources_source_id_idx" ON "project_sources" USING btree ("source_id");