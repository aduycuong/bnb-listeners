"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getStoredWorkspaceIndex } from "@/lib/workspaces/utils/workspace-index-storage";

export function WorkspaceIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    const index = getStoredWorkspaceIndex();
    router.replace(`/w/${index}`);
  }, [router]);

  return null;
}
