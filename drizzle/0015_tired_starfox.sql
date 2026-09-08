ALTER TABLE "workspace_llm_prompts" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_llm_prompts" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "topic_scope";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "topic_language";