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
