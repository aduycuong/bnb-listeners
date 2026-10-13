CREATE TABLE "item_refresh_schedules" (
	"content_item_id" uuid PRIMARY KEY NOT NULL,
	"next_refresh_at" timestamp with time zone NOT NULL,
	"checkpoint_hours" integer NOT NULL,
	"comments_collected_count" integer,
	"comments_collected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "activity_tier_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "monthly_record_limit" integer;--> statement-breakpoint
ALTER TABLE "item_refresh_schedules" ADD CONSTRAINT "item_refresh_schedules_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_refresh_schedules_next_refresh_at_idx" ON "item_refresh_schedules" USING btree ("next_refresh_at");