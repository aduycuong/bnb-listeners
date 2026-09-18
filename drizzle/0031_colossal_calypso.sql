ALTER TABLE "terms" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "terms" ADD COLUMN "embedding_model" text;--> statement-breakpoint
CREATE INDEX "idx_terms_embedding_hnsw" ON "terms" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64) WHERE "terms"."embedding" IS NOT NULL;