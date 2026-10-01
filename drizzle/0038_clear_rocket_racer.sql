CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"auto_create_terms" boolean DEFAULT true NOT NULL,
	"term_language" text DEFAULT 'auto' NOT NULL,
	"term_criteria" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "projects" (
	"workspace_id",
	"name",
	"auto_create_terms",
	"term_language",
	"term_criteria"
)
SELECT
	"id",
	"name",
	"auto_create_terms",
	"term_language",
	"term_criteria"
FROM "workspaces";
--> statement-breakpoint
ALTER TABLE "terms" DROP CONSTRAINT "terms_workspace_id_workspaces_id_fk";
--> statement-breakpoint
DROP INDEX "idx_terms_workspace_name";--> statement-breakpoint
DROP INDEX "idx_terms_workspace_id";--> statement-breakpoint
ALTER TABLE "terms" ADD COLUMN "project_id" uuid;--> statement-breakpoint
UPDATE "terms" AS "term"
SET "project_id" = "project"."id"
FROM "projects" AS "project"
WHERE "project"."workspace_id" = "term"."workspace_id";
--> statement-breakpoint
ALTER TABLE "terms" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_name_idx" ON "projects" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_terms_project_name" ON "terms" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "idx_terms_project_id" ON "terms" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "terms" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "auto_create_terms";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "term_language";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "term_criteria";
