CREATE TABLE "document_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"part_index" integer NOT NULL,
	"content_type" text NOT NULL,
	"value" text NOT NULL,
	"storage_key" text,
	"storage_url" text,
	"relevance_score" real,
	"detail_score" real,
	"part_score" real,
	"summary" text,
	"is_eligible" boolean DEFAULT false NOT NULL,
	"score_source" text,
	"score_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scored_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "part_id" uuid;--> statement-breakpoint
ALTER TABLE "document_parts" ADD CONSTRAINT "document_parts_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_document_parts_document_index" ON "document_parts" USING btree ("document_id","part_index");--> statement-breakpoint
CREATE INDEX "idx_document_parts_document_id" ON "document_parts" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_parts_eligible" ON "document_parts" USING btree ("document_id","is_eligible");--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_part_id_document_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."document_parts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunks_part_id" ON "chunks" USING btree ("part_id");