CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"doc_type" text NOT NULL,
	"published_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
	"embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"embedding_version" text DEFAULT 'v1' NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"media_url" text,
	"media_metadata" jsonb,
	"embedding_multimodal" vector(1024),
	"topic_slugs" text[] DEFAULT '{}',
	"quality_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_topics" (
	"document_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"assigned_by" text DEFAULT 'llm_classifier' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_topics_document_id_topic_id_pk" PRIMARY KEY("document_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"doc_type" text NOT NULL,
	"source_key" text NOT NULL,
	"source_name" text NOT NULL,
	"source_id" text NOT NULL,
	"title" text,
	"raw_content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding_status" text DEFAULT 'pending' NOT NULL,
	"quality_score" real,
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"canonical_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"summary" text,
	"source_chunk_ids" uuid[],
	"generated_at" timestamp with time zone,
	"doc_count" integer,
	"avg_quality_score" real,
	"trend_score" real,
	"trend_rank" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"description" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_by" text DEFAULT 'admin' NOT NULL,
	"source_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"granted_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"owner_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_topics" ADD CONSTRAINT "document_topics_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_topics" ADD CONSTRAINT "document_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_canonical_id_documents_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_digests" ADD CONSTRAINT "topic_digests_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_id_topics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunks_embedding_hnsw" ON "chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_chunks_embedding_mm_hnsw" ON "chunks" USING hnsw ("embedding_multimodal" vector_cosine_ops) WITH (m=16,ef_construction=64) WHERE "chunks"."embedding_multimodal" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_chunks_content_tsv" ON "chunks" USING gin ("content_tsv");--> statement-breakpoint
CREATE INDEX "idx_chunks_topic_slugs" ON "chunks" USING gin ("topic_slugs");--> statement-breakpoint
CREATE INDEX "idx_chunks_doc_type" ON "chunks" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "idx_chunks_content_type" ON "chunks" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "idx_chunks_published_at" ON "chunks" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_chunks_metadata" ON "chunks" USING gin ("metadata" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_document_id" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_type_recency" ON "chunks" USING btree ("doc_type","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_chunks_quality_score" ON "chunks" USING btree ("quality_score");--> statement-breakpoint
CREATE INDEX "idx_document_topics_topic" ON "document_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "idx_document_topics_document" ON "document_topics" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_documents_workspace_source" ON "documents" USING btree ("workspace_id","doc_type","source_key","source_id");--> statement-breakpoint
CREATE INDEX "idx_documents_workspace_id" ON "documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_documents_doc_type" ON "documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "idx_documents_source_key" ON "documents" USING btree ("doc_type","source_key");--> statement-breakpoint
CREATE INDEX "idx_documents_published_at" ON "documents" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_documents_created_at" ON "documents" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_documents_metadata" ON "documents" USING gin ("metadata" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("embedding_status") WHERE "documents"."embedding_status" <> 'chunked';--> statement-breakpoint
CREATE INDEX "idx_documents_quality_score" ON "documents" USING btree ("quality_score");--> statement-breakpoint
CREATE INDEX "idx_documents_is_duplicate" ON "documents" USING btree ("is_duplicate");--> statement-breakpoint
CREATE INDEX "idx_topic_digests_topic" ON "topic_digests" USING btree ("topic_id","period_end" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_topic_digests_trend" ON "topic_digests" USING btree ("period_start","trend_score");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_topics_workspace_slug" ON "topics" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "idx_topics_workspace_id" ON "topics" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_topics_parent" ON "topics" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_topics_verified" ON "topics" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "idx_topics_source_document" ON "topics" USING btree ("source_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_owner_user_id_idx" ON "workspaces" USING btree ("owner_user_id");