DROP TABLE "chunks" CASCADE;--> statement-breakpoint
DROP TABLE "comments" CASCADE;--> statement-breakpoint
DROP TABLE "data_source_group_members" CASCADE;--> statement-breakpoint
DROP TABLE "data_source_groups" CASCADE;--> statement-breakpoint
DROP TABLE "data_sources" CASCADE;--> statement-breakpoint
DROP TABLE "dim_dates" CASCADE;--> statement-breakpoint
DROP TABLE "document_parts" CASCADE;--> statement-breakpoint
DROP TABLE "document_terms" CASCADE;--> statement-breakpoint
DROP TABLE "documents" CASCADE;--> statement-breakpoint
DROP TABLE "research_runs" CASCADE;--> statement-breakpoint
DROP TABLE "source_runs" CASCADE;--> statement-breakpoint
DROP TABLE "system_schedule_runs" CASCADE;--> statement-breakpoint
DROP TABLE "system_schedules" CASCADE;--> statement-breakpoint
DROP TABLE "term_backfill_runs" CASCADE;--> statement-breakpoint
DROP TABLE "term_digest_daily" CASCADE;--> statement-breakpoint
DROP TABLE "terms" CASCADE;--> statement-breakpoint
DROP TABLE "workspace_task_runs" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "auto_create_terms";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "term_language";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "term_criteria";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "data_collection_scope";