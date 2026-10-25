import type { z } from "zod";

import type { EntityRole } from "./case-templates";
import type { ProjectCase } from "./project-cases";
import type {
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
  createdAt: string;
  updatedAt: string;
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
