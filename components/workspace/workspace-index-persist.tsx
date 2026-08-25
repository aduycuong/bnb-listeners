"use client";

import { useEffect } from "react";

import { setStoredWorkspaceIndex } from "@/lib/workspaces/utils/workspace-index-storage";

type WorkspaceIndexPersistProps = {
  workspaceIndex: number;
};

export function WorkspaceIndexPersist({
  workspaceIndex,
}: WorkspaceIndexPersistProps) {
  useEffect(() => {
    setStoredWorkspaceIndex(workspaceIndex);
  }, [workspaceIndex]);

  return null;
}
