CREATE TABLE "mention_keywords" (
	"mention_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "mention_keywords_mention_id_keyword_pk" PRIMARY KEY("mention_id","keyword")
);
--> statement-breakpoint
ALTER TABLE "mention_keywords" ADD CONSTRAINT "mention_keywords_mention_id_mentions_id_fk" FOREIGN KEY ("mention_id") REFERENCES "public"."mentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mention_keywords_keyword_idx" ON "mention_keywords" USING btree ("keyword");