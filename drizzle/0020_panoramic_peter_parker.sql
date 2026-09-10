CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"author_name" text,
	"author_id" text,
	"content" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"role" text,
	"stance" text,
	"is_substantive" boolean,
	"scored_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "debate_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "answer_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "info_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "agree_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "disagree_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "neutral_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_comments_document_source" ON "comments" USING btree ("document_id","source_id");--> statement-breakpoint
CREATE INDEX "idx_comments_workspace_id" ON "comments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_comments_document_id" ON "comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_comments_role" ON "comments" USING btree ("document_id","role");--> statement-breakpoint
CREATE INDEX "idx_comments_stance" ON "comments" USING btree ("document_id","stance");--> statement-breakpoint
CREATE INDEX "idx_comments_unscored" ON "comments" USING btree ("document_id") WHERE "comments"."scored_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_documents_debate" ON "documents" USING btree ("workspace_id","disagree_count" DESC NULLS LAST,"agree_count" DESC NULLS LAST);