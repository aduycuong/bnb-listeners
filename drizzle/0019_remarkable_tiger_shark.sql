ALTER TABLE "documents" DROP CONSTRAINT "documents_canonical_id_documents_id_fk";
--> statement-breakpoint
DROP INDEX "idx_documents_is_duplicate";--> statement-breakpoint
DROP INDEX "idx_documents_backfill_scan";--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "share_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "share_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_chunks_like_count" ON "chunks" USING btree ("like_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_documents_engagement" ON "documents" USING btree ("workspace_id","like_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_documents_backfill_scan" ON "documents" USING btree ("workspace_id","published_at","id") WHERE "documents"."published_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "is_duplicate";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "canonical_id";