ALTER TABLE "topics" DROP CONSTRAINT "topics_parent_id_topics_id_fk";
--> statement-breakpoint
DROP INDEX "idx_topics_parent";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "parent_id";