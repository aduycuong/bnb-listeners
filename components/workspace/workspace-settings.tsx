"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SettingsPageLayout } from "@/components/dashboard/settings-page-layout";
import { WorkspaceMembersSection } from "@/components/workspace/workspace-members-section";
import { WorkspaceTopicSettingsCard } from "@/components/workspace/workspace-topic-settings-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { workspacesQueryKey } from "@/hooks/use-workspace-route-context";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type WorkspaceSettingsProps = {
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkspaceSettings({
  workspace,
  workspaces,
  workspaceIndex,
}: WorkspaceSettingsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = workspace.permission === "owner";
  const canDelete = isOwner && workspaces.length > 1;

  async function handleDelete() {
    setDeleting(true);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not delete workspace.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: data.message ?? "Workspace deleted.",
        type: "success",
      });
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: workspacesQueryKey });

      const nextIndex = Math.min(workspaceIndex, workspaces.length - 2);
      router.push(`/w/${Math.max(nextIndex, 0)}`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsPageLayout
      title="Workspace settings"
      description="Details for the current workspace."
    >
      <Card>
        <CardHeader>
          <CardTitle>{workspace.name}</CardTitle>
          <CardDescription>General workspace information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium">{workspace.name}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Slug</dt>
              <dd className="text-sm font-medium">{workspace.slug ?? "—"}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Your permission</dt>
              <dd className="text-sm font-medium capitalize">
                {workspace.permission}
              </dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium">
                {formatDate(workspace.createdAt)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Last updated</dt>
              <dd className="text-sm font-medium">
                {formatDate(workspace.updatedAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <WorkspaceTopicSettingsCard workspace={workspace} />

      <WorkspaceMembersSection workspace={workspace} />

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Delete workspace</CardTitle>
            <CardDescription>
              Permanently remove this workspace and all of its data. This action
              cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex items-center gap-4">
            {!canDelete ? (
              <p className="text-sm text-muted-foreground">
                You cannot delete your only workspace.
              </p>
            ) : null}
            <div className="ml-auto shrink-0">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      disabled={!canDelete || deleting}
                    />
                  }
                >
                  Delete workspace
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete{" "}
                      <span className="font-medium text-foreground">
                        {workspace.name}
                      </span>{" "}
                      and all chats, members, and related data. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={deleting}
                      onClick={handleDelete}
                    >
                      {deleting ? (
                        <>
                          <Loader2Icon
                            className="animate-spin"
                            data-icon="inline-start"
                          />
                          Deleting…
                        </>
                      ) : (
                        "Delete workspace"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      ) : null}
    </SettingsPageLayout>
  );
}
