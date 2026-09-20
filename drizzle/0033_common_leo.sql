DROP INDEX "idx_chunks_term_ids";--> statement-breakpoint
DROP INDEX "idx_chunks_like_count";--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "term_ids";--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "like_count";--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "comment_count";--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "share_count";--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "view_count";