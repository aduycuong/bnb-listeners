"use client";

import { TopicListPage } from "@/components/topics/topic-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type TopicListRoutePageProps = {
  workspaceIndexParam: string;
};

export function TopicListRoutePage({
  workspaceIndexParam,
}: TopicListRoutePageProps) {
  const { workspace } = useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return <TopicListPage workspace={workspace} />;
}
