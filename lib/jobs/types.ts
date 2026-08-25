import type { z } from "zod";

import type { Job } from "@/db/schema";

import type {
  createJobBodySchema,
  jobFormSchema,
  updateJobBodySchema,
} from "./schema";

export type CreateJobBody = z.infer<typeof createJobBodySchema>;
export type CreateJobParams = CreateJobBody;
export type CreateJobResult = Job;

export type UpdateJobBody = z.infer<typeof updateJobBodySchema>;
export type UpdateJobParams = { id: string } & UpdateJobBody;
export type UpdateJobResult = Job;

export type DeleteJobParams = { id: string };
export type DeleteJobResult = { id: string; message: string };

export type GetJobParams = { id: string };
export type GetJobResult = Job;

import type { SchedulableJobType } from "./constants";

export type ListJobsParams = {
  jobType?: SchedulableJobType;
};
export type JobListItem = {
  id: string;
  name: string;
  jobType: string;
  enabled: boolean;
  cronConfig: { cron: string; timezone: string };
  createdAt: string;
  updatedAt: string;
};
export type ListJobsResult = { items: JobListItem[] };

export type JobFormValues = z.infer<typeof jobFormSchema>;

export type SyncJobScheduleParams = {
  jobId: string;
  userId: string;
};

export type ListJobRunsParams = { id: string };

export type JobRunListItem = {
  id: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type ListJobRunsResult = { items: JobRunListItem[] };

export type RunJobParams = { id: string };
export type RunJobResult = JobRunListItem;
