CREATE TABLE "project_compare_members" (
	"compare_project_id" uuid NOT NULL,
	"member_project_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_compare_members_compare_project_id_member_project_id_pk" PRIMARY KEY("compare_project_id","member_project_id")
);
--> statement-breakpoint
ALTER TABLE "project_compare_members" ADD CONSTRAINT "project_compare_members_compare_project_id_projects_id_fk" FOREIGN KEY ("compare_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_compare_members" ADD CONSTRAINT "project_compare_members_member_project_id_projects_id_fk" FOREIGN KEY ("member_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_compare_members_member_idx" ON "project_compare_members" USING btree ("member_project_id");