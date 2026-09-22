ALTER TABLE "research_runs" ADD COLUMN "report_html" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "html_status" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "html_error" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "html_model" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "html_finished_at" timestamp with time zone;