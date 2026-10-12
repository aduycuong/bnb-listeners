CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text,
	"url" text,
	"avatar_url" text,
	"follower_count" integer,
	"author_type" text,
	"origin" text DEFAULT 'connector' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collect_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector" text NOT NULL,
	"source_id" uuid,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"workflow_run_id" text,
	"external_job_id" text,
	"payload_key" text,
	"item_count" integer,
	"stats" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"platform" text NOT NULL,
	"source_id" uuid,
	"author_id" uuid,
	"parent_id" uuid,
	"root_id" uuid,
	"external_id" text NOT NULL,
	"url" text,
	"text" text DEFAULT '' NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"language" text,
	"content_hash" text NOT NULL,
	"published_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"reactions" jsonb,
	"origin" text DEFAULT 'connector' NOT NULL,
	"collect_run_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"collect_run_id" uuid,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"reactions" jsonb
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"source_type" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"name" text,
	"follower_count" integer,
	"member_count" integer,
	"activity_tier" text DEFAULT 'normal' NOT NULL,
	"origin" text DEFAULT 'connector' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_collected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collect_runs" ADD CONSTRAINT "collect_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_parent_id_content_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_root_id_content_items_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_collect_run_id_collect_runs_id_fk" FOREIGN KEY ("collect_run_id") REFERENCES "public"."collect_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_snapshots" ADD CONSTRAINT "engagement_snapshots_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_snapshots" ADD CONSTRAINT "engagement_snapshots_collect_run_id_collect_runs_id_fk" FOREIGN KEY ("collect_run_id") REFERENCES "public"."collect_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "authors_platform_external_id_idx" ON "authors" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "collect_runs_source_created_idx" ON "collect_runs" USING btree ("source_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "collect_runs_status_idx" ON "collect_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "collect_runs_external_job_id_idx" ON "collect_runs" USING btree ("external_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_items_platform_external_id_idx" ON "content_items" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "content_items_source_published_idx" ON "content_items" USING btree ("source_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "content_items_published_at_idx" ON "content_items" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "content_items_parent_id_idx" ON "content_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "content_items_root_id_idx" ON "content_items" USING btree ("root_id");--> statement-breakpoint
CREATE INDEX "content_items_author_id_idx" ON "content_items" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "content_items_collect_run_id_idx" ON "content_items" USING btree ("collect_run_id");--> statement-breakpoint
CREATE INDEX "content_items_origin_idx" ON "content_items" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "engagement_snapshots_item_captured_idx" ON "engagement_snapshots" USING btree ("content_item_id","captured_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_snapshots_item_run_idx" ON "engagement_snapshots" USING btree ("content_item_id","collect_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_platform_external_id_idx" ON "sources" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "sources_origin_idx" ON "sources" USING btree ("origin");