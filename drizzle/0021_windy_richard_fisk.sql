ALTER TABLE "job_runs" ADD COLUMN "run_type" text NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_job_runs_run_type" ON "job_runs" USING btree ("run_type");