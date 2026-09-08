"use client";

import { TopicDetailPage } from "@/components/topics/topic-detail-page";
import { TopicListPage } from "@/components/topics/topic-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type TopicListRoutePageProps = {
  workspaceIndexParam: string;
};

export function TopicListRoutePage({
  workspaceIndexParam,
}: TopicListRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return <TopicListPage workspace={workspace} workspaceIndex={workspaceIndex} />;
}

type TopicDetailRoutePageProps = {
  workspaceIndexParam: string;
  topicId: string;
};

export function TopicDetailRoutePage({
  workspaceIndexParam,
  topicId,
}: TopicDetailRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <TopicDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      topicId={topicId}
    />
  );
}
