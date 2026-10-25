"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SettingsPageLayout } from "@/components/dashboard/settings-page-layout";
import { EditWorkspaceGeneralDialog } from "@/components/workspace/edit-workspace-general-dialog";
import { WorkspaceApiKeysCard } from "@/components/workspace/workspace-api-keys-card";
import { WorkspaceMembersSection } from "@/components/workspace/workspace-members-section";
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
import { Badge } from "@/components/ui/badge";
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
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

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
  const [editGeneralOpen, setEditGeneralOpen] = useState(false);

  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");
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
      width="wide"
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>General</CardTitle>
            <CardDescription>General workspace information.</CardDescription>
          </div>
          {canEdit ? (
            <Button
              className="shrink-0"
              size="sm"
              variant="outline"
              onClick={() => setEditGeneralOpen(true)}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary"
            >
              {workspace.name.trim().charAt(0).toUpperCase() || "W"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight">
                {workspace.name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {workspace.slug ? `/${workspace.slug}` : "No slug"}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto capitalize">
              {workspace.permission}
            </Badge>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {formatDate(workspace.createdAt)}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Last updated</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {formatDate(workspace.updatedAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <EditWorkspaceGeneralDialog
        open={editGeneralOpen}
        onOpenChange={setEditGeneralOpen}
        workspace={workspace}
      />

      <WorkspaceMembersSection workspace={workspace} />

      <WorkspaceApiKeysCard workspace={workspace} />

      {isOwner ? (
        <Card className="border-destructive/40">
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
