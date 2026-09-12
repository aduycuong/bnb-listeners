import type { z } from "zod";

import type {
  createTermGroupBodySchema,
  setTermGroupMembersBodySchema,
  termGroupFormSchema,
  updateTermGroupBodySchema,
} from "./schema";

export type CreateTermGroupBody = z.infer<typeof createTermGroupBodySchema>;
export type CreateTermGroupParams = CreateTermGroupBody;
export type UpdateTermGroupBody = z.infer<typeof updateTermGroupBodySchema>;
export type UpdateTermGroupParams = { id: string } & UpdateTermGroupBody;
export type DeleteTermGroupParams = { id: string };
export type GetTermGroupParams = { id: string };

export type GetTermGroupChartParams = {
  id: string;
  period: import("@/lib/terms/term-detail-chart-config").TermDetailChartPeriodPreset;
  startDate?: string;
  endDate?: string;
  metric: import("@/lib/terms/term-detail-chart-config").TermDetailChartMetric;
};

export type TermGroupTopTermsSort = Exclude<
  import("@/lib/terms/term-card-config").TermCardSort,
  "created_at"
>;

export type TermGroupTopTermItem = {
  id: string;
  name: string;
  description: string | null;
  digest: import("@/lib/terms/types").TermCardDigest;
};

export type ListTermGroupTopTermsParams = {
  id: string;
  period: import("@/lib/terms/term-detail-chart-config").TermDetailChartPeriodPreset;
  startDate?: string;
  endDate?: string;
  sort: TermGroupTopTermsSort;
  limit?: number;
};

export type ListTermGroupTopTermsResult = {
  items: TermGroupTopTermItem[];
  period: {
    preset: import("@/lib/terms/term-detail-chart-config").TermDetailChartPeriodPreset;
    startDate: string;
    endDate: string;
  };
  sort: TermGroupTopTermsSort;
};
export type SetTermGroupMembersParams = {
  id: string;
} & z.infer<typeof setTermGroupMembersBodySchema>;

export type TermGroupListItem = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListTermGroupsResult = { items: TermGroupListItem[] };

export type TermGroupDetail = TermGroupListItem & {
  activeMemberRebuildRun: import("@/lib/term-group-member-rebuild/types").TermGroupMemberRebuildRunItem | null;
};

export type TermGroupMemberItem = {
  id: string;
  name: string;
  description: string | null;
  assignedBy: string;
  assignedAt: string;
};

export type ListTermGroupMembersParams = { id: string; search?: string };
export type ListTermGroupMembersResult = { items: TermGroupMemberItem[] };

export type CreateTermGroupResult = TermGroupListItem;
export type UpdateTermGroupResult = TermGroupListItem;
export type DeleteTermGroupResult = { id: string; message: string };
export type SetTermGroupMembersResult = {
  id: string;
  memberCount: number;
  message: string;
};

export type TermGroupFormValues = z.infer<typeof termGroupFormSchema>;

export type ClassifierTermGroup = {
  id: string;
  name: string;
  description: string | null;
};

export type ClassifiedTermForGroups = {
  id: string;
  name: string;
  description: string | null;
};
