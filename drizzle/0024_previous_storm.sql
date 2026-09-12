CREATE TABLE "term_group_members" (
	"term_group_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"assigned_by" text DEFAULT 'admin' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_group_members_term_group_id_term_id_pk" PRIMARY KEY("term_group_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "term_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "term_group_members" ADD CONSTRAINT "term_group_members_term_group_id_term_groups_id_fk" FOREIGN KEY ("term_group_id") REFERENCES "public"."term_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_group_members" ADD CONSTRAINT "term_group_members_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_groups" ADD CONSTRAINT "term_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_term_group_members_term" ON "term_group_members" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_term_groups_workspace_name" ON "term_groups" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_term_groups_workspace_id" ON "term_groups" USING btree ("workspace_id");