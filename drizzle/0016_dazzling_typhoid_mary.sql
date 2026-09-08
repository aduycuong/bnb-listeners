DROP TABLE "workspace_llm_prompts" CASCADE;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "data_collection_scope" text DEFAULT 'tin tức và dữ liệu về bất động sản' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "auto_create_topics" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "topic_language" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "topic_criteria" text DEFAULT '' NOT NULL;