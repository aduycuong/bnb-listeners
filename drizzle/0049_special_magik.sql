CREATE TABLE "mention_aspects" (
	"mention_id" uuid NOT NULL,
	"aspect_id" uuid NOT NULL,
	"source" text NOT NULL,
	"sentiment" text,
	CONSTRAINT "mention_aspects_mention_id_aspect_id_source_pk" PRIMARY KEY("mention_id","aspect_id","source")
);
--> statement-breakpoint
CREATE TABLE "mention_entities" (
	"mention_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"sentiment" text NOT NULL,
	CONSTRAINT "mention_entities_mention_id_entity_id_pk" PRIMARY KEY("mention_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "mention_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mention_id" uuid NOT NULL,
	"schema_key" text NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_labels" ADD COLUMN "sentiment" text;--> statement-breakpoint
ALTER TABLE "item_labels" ADD COLUMN "aspect_keys" jsonb;--> statement-breakpoint
ALTER TABLE "label_samples" ADD COLUMN "kind" text DEFAULT 'match' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "sentiment" text;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "auto_sentiment" text;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "sentiment_score" real;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "emotion" text;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "enrich_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "enrich_signature" text;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "enriched_content_hash" text;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "enriched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mention_aspects" ADD CONSTRAINT "mention_aspects_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_aspects" ADD CONSTRAINT "mention_aspects_aspect_id_project_aspects_id_fk" FOREIGN KEY ("aspect_id") REFERENCES "public"."project_aspects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_entities" ADD CONSTRAINT "mention_entities_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_entities" ADD CONSTRAINT "mention_entities_entity_id_project_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."project_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_extractions" ADD CONSTRAINT "mention_extractions_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mention_aspects_aspect_id_idx" ON "mention_aspects" USING btree ("aspect_id");--> statement-breakpoint
CREATE INDEX "mention_entities_entity_id_idx" ON "mention_entities" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "mention_extractions_mention_id_idx" ON "mention_extractions" USING btree ("mention_id");--> statement-breakpoint
CREATE INDEX "mention_extractions_schema_key_idx" ON "mention_extractions" USING btree ("schema_key");