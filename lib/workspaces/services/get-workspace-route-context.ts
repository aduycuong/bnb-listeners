import { cache } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

import type { WorkspaceListItem } from "../types";
import {
  clampWorkspaceIndex,
  parseWorkspaceIndexParam,
} from "../utils/parse-workspace-index-param";
import { listWorkspacesForUser } from "./list-workspaces-for-user";

export type WorkspaceRouteContext = {
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

export const getWorkspaceRouteContext = cache(
  async (workspaceIndexParam: string): Promise<WorkspaceRouteContext> => {
    const session = await getSession();
    if (!session) {
      redirect("/sign-in");
    }

    const parsedIndex = parseWorkspaceIndexParam(workspaceIndexParam);
    const { items: workspaces } = await listWorkspacesForUser({
      userId: session.id,
    });

    if (workspaces.length === 0) {
      redirect("/sign-in");
    }

    const workspaceIndex =
      parsedIndex === null
        ? 0
        : clampWorkspaceIndex(parsedIndex, workspaces.length);

    if (parsedIndex === null || parsedIndex !== workspaceIndex) {
      redirect(`/w/${workspaceIndex}`);
    }

    return {
      workspace: workspaces[workspaceIndex],
      workspaces,
      workspaceIndex,
    };
  },
);
