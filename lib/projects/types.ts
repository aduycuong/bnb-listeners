import type { z } from "zod";

import type { EntityRole } from "./case-templates";
import type { CompareCase, ProjectCase } from "./project-cases";
import type {
  CreateCompareProjectBody,
  CreateProjectWithConfigBody,
  ProjectAlertsInput,
  ProjectConfigBody,
  createProjectSchema,
  updateProjectSchema,
} from "./schema";

export type ProjectListItem = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  case: ProjectCase;
  caseVersion: number;
  configVersion: number;
  chatWidget: ProjectChatWidget;
  createdAt: string;
  updatedAt: string;
};

export type ProjectChatWidget = {
  enabled: boolean;
  publicKey: string;
};

export type ListProjectsParams = {
  workspaceId: string;
};

export type ListProjectsResult = {
  items: ProjectListItem[];
};

export type CreateProjectParams = {
  workspaceId: string;
} & z.infer<typeof createProjectSchema>;

export type CreateProjectResult = ProjectListItem & {
  message: string;
};

export type UpdateProjectParams = {
  workspaceId: string;
  projectId: string;
} & z.infer<typeof updateProjectSchema>;

export type UpdateProjectResult = ProjectListItem & {
  message: string;
};

export type DeleteProjectParams = {
  workspaceId: string;
  projectId: string;
};

export type DeleteProjectResult = {
  message: string;
};

export type CreateProjectWithConfigParams = {
  workspaceId: string;
} & CreateProjectWithConfigBody;

export type ProjectEntityDetail = {
  id: string;
  role: EntityRole;
  name: string;
  aliases: string[];
  ambiguousAliases: string[];
  queryId: string | null;
  withTerms: string[];
  exclude: string[];
  queryVersion: number | null;
};

export type ProjectAspectDetail = {
  id: string;
  key: string;
  name: string;
  description: string;
};

export type ProjectConfigDetail = {
  projectId: string;
  case: ProjectCase;
  caseVersion: number;
  configVersion: number;
  caseConfig: Record<string, unknown>;
  entities: ProjectEntityDetail[];
  aspects: ProjectAspectDetail[];
  sourceIds: string[];
  alerts: ProjectAlertsInput;
};

export type GetProjectConfigParams = {
  workspaceId: string;
  projectId: string;
};

export type UpdateProjectConfigParams = {
  workspaceId: string;
  projectId: string;
} & ProjectConfigBody;

export type UpdateProjectConfigResult = ProjectConfigDetail & {
  message: string;
};

export type SelectableSource = {
  id: string;
  platform: string;
  sourceType: string;
  name: string | null;
  url: string | null;
  origin: string;
  memberCount: number | null;
  postCount: number;
  lastCollectedAt: string | null;
};

export type ListSelectableSourcesResult = {
  items: SelectableSource[];
};

export type ProjectSummaryDailyPoint = {
  dateKey: string;
  mentions: number;
};

/** A project with the numbers of its card on the project list. */
export type ProjectSummaryItem = ProjectListItem & {
  /** Relevant mentions of the last `periodDays` days of the project's timezone. */
  mentions: number;
  previousMentions: number;
  /** Net sentiment score, −100 to +100; null when no mention has a sentiment. */
  nss: number | null;
  /** Share of negative mentions among scored ones, in %; null when none are scored. */
  negativeShare: number | null;
  alerts: number;
  sources: number;
  daily: ProjectSummaryDailyPoint[];
};

export type ListProjectSummariesParams = {
  workspaceId: string;
};

export type ListProjectSummariesResult = {
  periodDays: number;
  items: ProjectSummaryItem[];
};

export type CreateCompareProjectParams = CreateCompareProjectBody & { workspaceId: string };

/** A project a compare project reads, with what the comparison needs to know of it. */
export type CompareMember = {
  id: string;
  name: string;
  /** The project the others are compared against. */
  primary: boolean;
  case: ProjectCase;
  timezone: string;
  /** Project aspects in order; comparisons only line up keys every member has. */
  aspects: { key: string; name: string }[];
};

export type CheckCompareMembersParams = {
  workspaceId: string;
  case: CompareCase;
  primaryId: string;
  competitorIds: string[];
  /** The compare project itself, when editing, so it is not taken as a member. */
  compareProjectId?: string;
};

export type CheckCompareMembersResult = {
  /** The primary project first, then the competitors in order. */
  members: CompareMember[];
  /** Why the members cannot be saved; empty when they can. */
  issues: string[];
  /** Saved anyway, shown when picking members. */
  warnings: string[];
  /** Aspects every member has, by key, in the first member's order. */
  sharedAspects: { key: string; name: string }[];
};

export type UpdateCompareMembersParams = {
  workspaceId: string;
  projectId: string;
  primaryId: string;
  competitorIds: string[];
};
