import type { z } from "zod";

import type { DataSource } from "@/db/schema";

import type {
  createDataSourceBodySchema,
  dataSourceFormSchema,
  updateDataSourceBodySchema,
} from "./schema";

export type CreateDataSourceBody = z.infer<typeof createDataSourceBodySchema>;
export type CreateDataSourceParams = CreateDataSourceBody;
export type CreateDataSourceResult = DataSource;

export type UpdateDataSourceBody = z.infer<typeof updateDataSourceBodySchema>;
export type UpdateDataSourceParams = { id: string } & UpdateDataSourceBody;
export type UpdateDataSourceResult = DataSource;

export type DeleteDataSourceParams = { id: string };
export type DeleteDataSourceResult = { id: string; message: string };

export type GetDataSourceParams = { id: string };
export type GetDataSourceResult = DataSource;

import type { SourceType } from "./constants";

export type ListDataSourcesParams = {
  sourceType?: SourceType;
};
export type DataSourceListItem = {
  id: string;
  name: string;
  sourceType: string;
  enabled: boolean;
  cronConfig: { cron: string; timezone: string };
  createdAt: string;
  updatedAt: string;
};
export type ListDataSourcesResult = { items: DataSourceListItem[] };

export type DataSourceFormValues = z.infer<typeof dataSourceFormSchema>;

export type SyncDataSourceScheduleParams = {
  dataSourceId: string;
  userId: string;
};

export type ListSourceRunsParams = { id: string };

export type SourceRunListItem = {
  id: string;
  runType: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type ListSourceRunsResult = { items: SourceRunListItem[] };

export type RunDataSourceParams = { id: string };
export type RunDataSourceResult = SourceRunListItem;
