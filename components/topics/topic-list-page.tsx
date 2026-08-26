"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { ResourceListPage } from "@/components/dashboard/resource-list-page";
import { TopicDeleteDialog } from "@/components/topics/topic-delete-dialog";
import { TopicFormDialog } from "@/components/topics/topic-form-dialog";
import { topicsQueryKey } from "@/components/topics/topic-query-keys";
import { Button } from "@/components/ui/button";
import { TOPIC_CONFIG, TOPIC_CREATED_BY } from "@/lib/topics/topic-config";
import type { ListTopicsResult, TopicListItem } from "@/lib/topics/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TopicListPageProps = {
  workspace: WorkspaceListItem;
};

async function fetchTopics(workspaceId: string): Promise<ListTopicsResult> {
  const res = await workspaceFetch(workspaceId, "/api/topics");
  const data = (await res.json()) as ListTopicsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load topics.");
  }

  return data;
}

function getVerifiedBadge(verified: boolean) {
  return verified
    ? {
        label: "Verified",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      }
    : {
        label: "Unverified",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
}

export function TopicListPage({ workspace }: TopicListPageProps) {
  const canEdit = workspace.permission !== "read";
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicListItem | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<
    TopicListItem | undefined
  >();

  const { data, isLoading, error } = useQuery({
    queryKey: topicsQueryKey(workspace.id),
    queryFn: () => fetchTopics(workspace.id),
  });

  const topics = data?.items ?? [];

  const items = useMemo(() => {
    return topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      subtitle: topic.parentName
        ? `Parent: ${topic.parentName}`
        : undefined,
      description: topic.description ?? undefined,
      date: topic.createdAt,
      badges: [
        getVerifiedBadge(topic.verified),
        ...(topic.createdBy === TOPIC_CREATED_BY.llmClassifier
          ? [
              {
                label: "Classifier",
                className: "bg-muted text-muted-foreground",
              },
            ]
          : []),
      ],
    }));
  }, [topics]);

  async function refreshTopics() {
    await queryClient.invalidateQueries({
      queryKey: topicsQueryKey(workspace.id),
    });
  }

  function openCreate() {
    setEditingTopic(undefined);
    setFormOpen(true);
  }

  function openEdit(topicId: string) {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic) {
      return;
    }

    setEditingTopic(topic);
    setFormOpen(true);
  }

  function openDelete(topicId: string) {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic) {
      return;
    }

    setDeletingTopic(topic);
    setDeleteOpen(true);
  }

  return (
    <>
      <ResourceListPage
        title={TOPIC_CONFIG.listTitle}
        description={TOPIC_CONFIG.listDescription}
        items={items}
        emptyTitle={TOPIC_CONFIG.emptyTitle}
        emptyDescription={
          canEdit
            ? TOPIC_CONFIG.emptyDescription
            : "Topics will appear here once they are added to this workspace."
        }
        createLabel={TOPIC_CONFIG.createLabel}
        onCreateClick={canEdit ? openCreate : undefined}
        isLoading={isLoading}
        errorMessage={error?.message}
        renderItemActions={
          canEdit
            ? (item) => (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => openEdit(item.id)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => openDelete(item.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              )
            : undefined
        }
      />

      <TopicFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workspaceId={workspace.id}
        topics={topics}
        topic={editingTopic}
        onSaved={refreshTopics}
      />

      <TopicDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspace.id}
        topic={deletingTopic}
        onDeleted={refreshTopics}
      />
    </>
  );
}
