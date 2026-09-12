import type { z } from "zod";

import type {
  createTermBodySchema,
  mergeTermsBodySchema,
  termFormSchema,
  updateTermBodySchema,
} from "./schema";

export type CreateTermBody = z.infer<typeof createTermBodySchema>;
export type CreateTermParams = CreateTermBody;
export type CreateTermResult = TermListItem;

export type UpdateTermBody = z.infer<typeof updateTermBodySchema>;
export type UpdateTermParams = { id: string } & UpdateTermBody;
export type UpdateTermResult = TermListItem;

export type DeleteTermParams = { id: string };
export type DeleteTermResult = { id: string; message: string };

export type BulkDeleteTermsParams = { ids: string[] };
export type BulkDeleteTermsFailure = { id: string; message: string };
export type BulkDeleteTermsResult = {
  deletedIds: string[];
  failures: BulkDeleteTermsFailure[];
  message: string;
};

export type MergeTermsParams = z.infer<typeof mergeTermsBodySchema>;
export type MergeTermsFailure = { id: string; message: string };
export type MergeTermsResult = {
  targetId: string;
  targetName: string;
  deletedIds: string[];
  failures: MergeTermsFailure[];
  documentsAssigned: number;
  message: string;
};

export type TermListItem = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  sourceDocumentId: string | null;
  listeningStartedAt: string;
  activeBackfillRunId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTermsResult = { items: TermListItem[] };

export type TermCardPeriodPreset =
  import("./term-card-config").TermCardPeriodPreset;

export type TermCardSort = import("./term-card-config").TermCardSort;

export type TermCardDigest = {
  docCount: number;
  avgQualityScore: number | null;
  trendScore: number | null;
  isStale: boolean;
};

export type TermCardSparklinePoint = {
  dateKey: string;
  docCount: number;
};

export type TermCardGroup = {
  id: string;
  name: string;
};

export type TermCardItem = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  groups: TermCardGroup[];
  digest: TermCardDigest;
  sparkline: TermCardSparklinePoint[];
};

export type ResolvedTermCardPeriod = {
  preset: TermCardPeriodPreset;
  startDate: string;
  endDate: string;
};

export type ListTermCardsParams = {
  period: TermCardPeriodPreset;
  startDate?: string;
  endDate?: string;
  sort: TermCardSort;
  offset?: number;
  limit?: number;
  /** Omit or empty for all jobs; pass UUIDs to filter to those jobs. */
  jobIds?: string[];
  /** Full-text search over term name and description. */
  search?: string;
  /** Filter to terms that belong to this group. */
  groupId?: string;
};

export type ListTermsParams = {
  search?: string;
};

export type ListTermCardsResult = {
  items: TermCardItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
  period: ResolvedTermCardPeriod;
};

export type TermFormValues = z.infer<typeof termFormSchema>;

export type TermSourceDocumentSummary = {
  id: string;
  title: string | null;
  sourceName: string;
  sourceId: string;
};

export type GetTermParams = { id: string };
export type GetTermResult = TermListItem & {
  sourceDocument: TermSourceDocumentSummary | null;
  activeBackfillRun: import("@/lib/term-backfill/types").TermBackfillRunItem | null;
};

export type TermDetailChartDigest = {
  docCount: number;
  avgQualityScore: number | null;
  trendScore: number | null;
  isStale: boolean;
};

export type TermDetailChartPoint = {
  bucketKey: string;
  label: string;
  value: number | null;
};

export type GetTermChartParams = {
  id: string;
  period: import("./term-detail-chart-config").TermDetailChartPeriodPreset;
  startDate?: string;
  endDate?: string;
  metric: import("./term-detail-chart-config").TermDetailChartMetric;
};

export type GetTermChartResult = {
  points: TermDetailChartPoint[];
  bucket: import("./utils/resolve-term-detail-chart-period").TermDetailChartBucket;
  metric: import("./term-detail-chart-config").TermDetailChartMetric;
  digest: TermDetailChartDigest;
  period: {
    preset: import("./term-detail-chart-config").TermDetailChartPeriodPreset;
    startDate: string;
    endDate: string;
  };
};

export type ListTermDocumentsParams = {
  termId: string;
  jobIds?: string[];
  search?: string;
  offset?: number;
  limit?: number;
};

export type TermDocumentListItem = {
  id: string;
  title: string | null;
  sourceName: string;
  sourceId: string;
  jobName: string | null;
  publishedAt: string | null;
  confidence: number;
  qualityScore: number | null;
};

export type ListTermDocumentsResult = {
  items: TermDocumentListItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
};
