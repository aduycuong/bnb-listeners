DROP INDEX "idx_chunks_topic_slugs";--> statement-breakpoint
DROP INDEX "idx_topics_workspace_slug";--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "topic_ids" uuid[] DEFAULT '{}';--> statement-breakpoint
CREATE INDEX "idx_chunks_topic_ids" ON "chunks" USING gin ("topic_ids");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_topics_workspace_name" ON "topics" USING btree ("workspace_id","name");--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "topic_slugs";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "slug";