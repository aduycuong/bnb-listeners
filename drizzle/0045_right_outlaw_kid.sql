DROP INDEX "alert_rules_project_key_idx";--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "kind" text NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "alert_rules_project_id_idx" ON "alert_rules" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "key";--> statement-breakpoint
ALTER TABLE "alert_rules" DROP COLUMN "type";