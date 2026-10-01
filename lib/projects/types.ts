import type { z } from "zod";

import type { TermLanguage } from "@/lib/workspaces/constants";

import type { ProjectCase } from "./project-cases";
import type { createProjectSchema, updateProjectSchema } from "./schema";

export type ProjectListItem = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  case: ProjectCase;
  autoCreateTerms: boolean;
  termLanguage: TermLanguage;
  termCriteria: string;
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
