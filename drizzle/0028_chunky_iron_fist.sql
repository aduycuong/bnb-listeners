CREATE TABLE "data_source_group_members" (
	"data_source_group_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"assigned_by" text DEFAULT 'admin' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_source_group_members_data_source_group_id_data_source_id_pk" PRIMARY KEY("data_source_group_id","data_source_id")
);
--> statement-breakpoint
CREATE TABLE "data_source_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_source_group_members" ADD CONSTRAINT "data_source_group_members_data_source_group_id_data_source_groups_id_fk" FOREIGN KEY ("data_source_group_id") REFERENCES "public"."data_source_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_source_group_members" ADD CONSTRAINT "data_source_group_members_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_source_groups" ADD CONSTRAINT "data_source_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_data_source_group_members_data_source" ON "data_source_group_members" USING btree ("data_source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_data_source_groups_workspace_name" ON "data_source_groups" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_data_source_groups_workspace_id" ON "data_source_groups" USING btree ("workspace_id");