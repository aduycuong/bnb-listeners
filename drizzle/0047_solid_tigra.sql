CREATE TABLE "match_judgments" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"is_relevant" boolean NOT NULL,
	"reason" text,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"root_item_id" uuid,
	"kind" text NOT NULL,
	"platform" text NOT NULL,
	"source_id" uuid,
	"author_id" uuid,
	"published_at" timestamp with time zone,
	"origin" text NOT NULL,
	"matched_query_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matched_entity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matched_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"match_type" text NOT NULL,
	"match_tier" text NOT NULL,
	"is_relevant" boolean NOT NULL,
	"match_reason" text,
	"match_signature" text NOT NULL,
	"user_corrected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_queries" ADD COLUMN "ambiguous" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "match_signature" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mentions_project_item_idx" ON "mentions" USING btree ("project_id","content_item_id");--> statement-breakpoint
CREATE INDEX "mentions_project_published_idx" ON "mentions" USING btree ("project_id","published_at");--> statement-breakpoint
CREATE INDEX "mentions_project_root_idx" ON "mentions" USING btree ("project_id","root_item_id");--> statement-breakpoint
CREATE INDEX "mentions_content_item_id_idx" ON "mentions" USING btree ("content_item_id");