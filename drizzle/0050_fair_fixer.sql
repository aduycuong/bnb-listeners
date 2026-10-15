CREATE TABLE "mention_embeddings" (
	"mention_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"text_hash" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mention_embeddings_mention_id_kind_pk" PRIMARY KEY("mention_id","kind")
);
--> statement-breakpoint
CREATE TABLE "mention_topics" (
	"mention_id" uuid PRIMARY KEY NOT NULL,
	"topic_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"aspect_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"centroid" vector(1536),
	"mention_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "topic_hint" text;--> statement-breakpoint
ALTER TABLE "mentions" ADD COLUMN "topic_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "mention_embeddings" ADD CONSTRAINT "mention_embeddings_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_topics" ADD CONSTRAINT "mention_topics_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_topics" ADD CONSTRAINT "mention_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_aspect_id_project_aspects_id_fk" FOREIGN KEY ("aspect_id") REFERENCES "public"."project_aspects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_merged_into_id_topics_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mention_topics_topic_id_idx" ON "mention_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topics_project_status_idx" ON "topics" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "mentions_project_topic_status_idx" ON "mentions" USING btree ("project_id","topic_status");