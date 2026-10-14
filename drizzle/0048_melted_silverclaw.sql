CREATE TABLE "item_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"is_relevant" boolean NOT NULL,
	"sample_id" uuid,
	"labeled_by" uuid,
	"labeled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_sample_items" (
	"sample_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"stratum" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "label_sample_items_sample_id_content_item_id_pk" PRIMARY KEY("sample_id","content_item_id")
);
--> statement-breakpoint
CREATE TABLE "label_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"strata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"match_signature" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "auto_is_relevant" boolean;--> statement-breakpoint
ALTER TABLE "item_labels" ADD CONSTRAINT "item_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_labels" ADD CONSTRAINT "item_labels_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_labels" ADD CONSTRAINT "item_labels_sample_id_label_samples_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."label_samples"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_labels" ADD CONSTRAINT "item_labels_labeled_by_users_id_fk" FOREIGN KEY ("labeled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_sample_items" ADD CONSTRAINT "label_sample_items_sample_id_label_samples_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."label_samples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_sample_items" ADD CONSTRAINT "label_sample_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_samples" ADD CONSTRAINT "label_samples_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_samples" ADD CONSTRAINT "label_samples_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_labels_project_item_idx" ON "item_labels" USING btree ("project_id","content_item_id");--> statement-breakpoint
CREATE INDEX "item_labels_sample_id_idx" ON "item_labels" USING btree ("sample_id");--> statement-breakpoint
CREATE INDEX "label_sample_items_sample_position_idx" ON "label_sample_items" USING btree ("sample_id","position");--> statement-breakpoint
CREATE INDEX "label_samples_project_id_idx" ON "label_samples" USING btree ("project_id");