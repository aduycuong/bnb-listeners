CREATE TABLE "dim_dates" (
	"date_key" date PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"month" integer NOT NULL,
	"week" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"day_of_year" integer NOT NULL,
	"is_weekend" boolean NOT NULL,
	"week_start" date NOT NULL,
	"month_start" date NOT NULL,
	"quarter_start" date NOT NULL,
	"year_start" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_digest_daily" (
	"topic_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"doc_count" integer DEFAULT 0 NOT NULL,
	"avg_quality_score" real,
	"trend_score" real,
	"is_stale" boolean DEFAULT true NOT NULL,
	"recompute_after" timestamp with time zone,
	"processing" boolean DEFAULT false NOT NULL,
	"processing_started_at" timestamp with time zone,
	"computed_at" timestamp with time zone,
	CONSTRAINT "topic_digest_daily_topic_id_date_key_pk" PRIMARY KEY("topic_id","date_key")
);
--> statement-breakpoint
CREATE TABLE "topic_digest_rollup" (
	"topic_id" uuid NOT NULL,
	"period_grain" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"doc_count" integer DEFAULT 0 NOT NULL,
	"avg_quality_score" real,
	"trend_score" real,
	"trend_rank" integer,
	"computed_at" timestamp with time zone,
	CONSTRAINT "topic_digest_rollup_topic_id_period_grain_period_start_pk" PRIMARY KEY("topic_id","period_grain","period_start")
);
--> statement-breakpoint
DROP TABLE "topic_digests" CASCADE;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD CONSTRAINT "topic_digest_daily_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_digest_daily" ADD CONSTRAINT "topic_digest_daily_date_key_dim_dates_date_key_fk" FOREIGN KEY ("date_key") REFERENCES "public"."dim_dates"("date_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_digest_rollup" ADD CONSTRAINT "topic_digest_rollup_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_topic_digest_daily_date" ON "topic_digest_daily" USING btree ("date_key","topic_id");--> statement-breakpoint
CREATE INDEX "idx_topic_digest_daily_stale" ON "topic_digest_daily" USING btree ("recompute_after") WHERE "topic_digest_daily"."is_stale" = true AND "topic_digest_daily"."processing" = false;--> statement-breakpoint
CREATE INDEX "idx_topic_digest_rollup_grain_period" ON "topic_digest_rollup" USING btree ("period_grain","period_start","trend_score" DESC NULLS LAST);