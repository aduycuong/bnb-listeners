CREATE TABLE "mention_enrichments" (
	"mention_id" uuid NOT NULL,
	"enricher_key" text NOT NULL,
	"status" text NOT NULL,
	"signature" text,
	"content_hash" text,
	"model" text,
	"error" text,
	"enriched_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mention_enrichments_mention_id_enricher_key_pk" PRIMARY KEY("mention_id","enricher_key")
);
--> statement-breakpoint
CREATE TABLE "mention_sentiments" (
	"mention_id" uuid PRIMARY KEY NOT NULL,
	"sentiment" text NOT NULL,
	"sentiment_score" real NOT NULL,
	"emotion" text
);
--> statement-breakpoint
CREATE TABLE "mention_terms" (
	"mention_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"term" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "mention_terms_mention_id_kind_term_pk" PRIMARY KEY("mention_id","kind","term")
);
--> statement-breakpoint
CREATE TABLE "project_enrichers" (
	"project_id" uuid NOT NULL,
	"enricher_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_enrichers_project_id_enricher_key_pk" PRIMARY KEY("project_id","enricher_key")
);
--> statement-breakpoint
CREATE TABLE "term_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"canonical" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mention_keywords" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "mention_keywords" CASCADE;--> statement-breakpoint
ALTER TABLE "mention_topics" DROP CONSTRAINT "mention_topics_topic_id_topics_id_fk";
--> statement-breakpoint
DROP INDEX "mentions_project_topic_status_idx";--> statement-breakpoint
DROP INDEX "topics_project_status_idx";--> statement-breakpoint
ALTER TABLE "mention_aspects" DROP CONSTRAINT "mention_aspects_mention_id_aspect_id_source_pk";--> statement-breakpoint
ALTER TABLE "mention_topics" DROP CONSTRAINT "mention_topics_pkey";--> statement-breakpoint
ALTER TABLE "mention_aspects" ADD CONSTRAINT "mention_aspects_mention_id_aspect_id_pk" PRIMARY KEY("mention_id","aspect_id");--> statement-breakpoint
ALTER TABLE "mention_topics" ADD COLUMN "kind" text DEFAULT 'topic' NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "kind" text DEFAULT 'topic' NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mention_topics" ADD CONSTRAINT "mention_topics_mention_id_kind_pk" PRIMARY KEY("mention_id","kind");--> statement-breakpoint
ALTER TABLE "mention_enrichments" ADD CONSTRAINT "mention_enrichments_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_sentiments" ADD CONSTRAINT "mention_sentiments_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_terms" ADD CONSTRAINT "mention_terms_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_enrichers" ADD CONSTRAINT "project_enrichers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mention_enrichments_key_status_idx" ON "mention_enrichments" USING btree ("enricher_key","status");--> statement-breakpoint
CREATE INDEX "mention_terms_kind_term_idx" ON "mention_terms" USING btree ("kind","term");--> statement-breakpoint
CREATE UNIQUE INDEX "term_dictionary_scope_kind_canonical_idx" ON "term_dictionary" USING btree ("scope_type","scope_id","kind","canonical");--> statement-breakpoint
CREATE INDEX "topics_project_kind_status_idx" ON "topics" USING btree ("project_id","kind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_id_kind_idx" ON "topics" USING btree ("id","kind");--> statement-breakpoint
ALTER TABLE "mention_topics" ADD CONSTRAINT "mention_topics_topic_kind_fk" FOREIGN KEY ("topic_id","kind") REFERENCES "public"."topics"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_aspects" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "sentiment";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "auto_sentiment";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "sentiment_score";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "emotion";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "enrich_status";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "enrich_signature";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "enriched_content_hash";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "enriched_at";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "topic_hint";--> statement-breakpoint
ALTER TABLE "mentions" DROP COLUMN "topic_status";