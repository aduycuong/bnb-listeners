ALTER TABLE "documents" ADD COLUMN "author_name" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "parent_document_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_document_id_documents_id_fk" FOREIGN KEY ("parent_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_parent_document_id" ON "documents" USING btree ("parent_document_id");