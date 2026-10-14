CREATE TABLE "persona_panel_members" (
	"panel_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	CONSTRAINT "persona_panel_members_panel_id_persona_id_pk" PRIMARY KEY("panel_id","persona_id")
);
--> statement-breakpoint
CREATE TABLE "persona_panels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" text,
	"name" text NOT NULL,
	"kind" text DEFAULT 'individual' NOT NULL,
	"description" text NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"concerns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "persona_id" uuid;--> statement-breakpoint
ALTER TABLE "persona_panel_members" ADD CONSTRAINT "persona_panel_members_panel_id_persona_panels_id_fk" FOREIGN KEY ("panel_id") REFERENCES "public"."persona_panels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_panel_members" ADD CONSTRAINT "persona_panel_members_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "persona_panel_members_persona_id_idx" ON "persona_panel_members" USING btree ("persona_id");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_panels_template_key_idx" ON "persona_panels" USING btree ("template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "personas_template_key_idx" ON "personas" USING btree ("template_key");--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authors_persona_id_idx" ON "authors" USING btree ("persona_id");