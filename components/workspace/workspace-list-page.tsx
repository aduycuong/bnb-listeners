"use client";

import { useQuery } from "@tanstack/react-query";
import { LayoutGridIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "next-i18next/client";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  workspacesQueryKey,
  fetchWorkspaces,
} from "@/hooks/use-workspace-route-context";
import { setStoredWorkspaceIndex } from "@/lib/workspaces/utils/workspace-index-storage";

export function WorkspaceListPage() {
  const { t } = useT("dashboard");
  const [createOpen, setCreateOpen] = useState(false);

  const workspacesQuery = useQuery({
    queryKey: workspacesQueryKey,
    queryFn: fetchWorkspaces,
  });

  const workspaces = workspacesQuery.data?.items ?? [];
  const isInitialLoading = workspacesQuery.isLoading;
  const errorMessage = workspacesQuery.error?.message;

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("workspacesPage.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("workspacesPage.description")}
            </p>
          </div>

          <Button
            type="button"
            className="shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            {t("workspacesPage.create")}
          </Button>
        </div>

        {errorMessage ? (
          <ResourceListEmpty
            title={t("workspacesPage.loadErrorTitle")}
            description={errorMessage}
          />
        ) : isInitialLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <ResourceListEmpty
            title={t("workspacesPage.emptyTitle")}
            description={t("workspacesPage.emptyDescription")}
            actionLabel={t("workspacesPage.create")}
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace, index) => (
              <li key={workspace.id}>
                <Link
                  href={`/w/${index}`}
                  onClick={() => setStoredWorkspaceIndex(index)}
                  className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-muted-foreground/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2 text-muted-foreground">
                      <LayoutGridIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold">
                        {workspace.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {workspace.dataCollectionScope.trim() ||
                          t("workspacesPage.noScope")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {t(`workspacePermission.${workspace.permission}`)}
                    </span>
                    {workspace.slug ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {workspace.slug}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceCount={workspaces.length}
      />
    </>
  );
}
