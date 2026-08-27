CREATE TABLE "workspace_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"unkey_key_id" text NOT NULL,
	"name" text NOT NULL,
	"key_start" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_api_keys_unkey_key_id_unique" UNIQUE("unkey_key_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_api_keys" ADD CONSTRAINT "workspace_api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workspace_api_keys_workspace_id" ON "workspace_api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workspace_api_keys_unkey_key_id" ON "workspace_api_keys" USING btree ("unkey_key_id");