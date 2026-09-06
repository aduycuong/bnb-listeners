DROP INDEX "idx_topic_digest_daily_stale";--> statement-breakpoint
DROP INDEX "idx_topic_digest_daily_bulk_stale";--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD COLUMN "stale_since" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_topic_digest_daily_stale" ON "topic_digest_daily" USING btree ("stale_since") WHERE "topic_digest_daily"."is_stale" = true AND "topic_digest_daily"."is_bulk_stale" = false AND "topic_digest_daily"."processing" = false;--> statement-breakpoint
CREATE INDEX "idx_topic_digest_daily_bulk_stale" ON "topic_digest_daily" USING btree ("stale_since") WHERE "topic_digest_daily"."is_stale" = true AND "topic_digest_daily"."is_bulk_stale" = true AND "topic_digest_daily"."processing" = false;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" DROP COLUMN "recompute_after";