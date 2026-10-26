ALTER TABLE "workspace_api_keys" ADD COLUMN "scopes" jsonb DEFAULT '["reports:read","mentions:read"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_api_keys" ADD COLUMN "project_ids" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_api_keys" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "workspace_api_keys" ADD CONSTRAINT "workspace_api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;