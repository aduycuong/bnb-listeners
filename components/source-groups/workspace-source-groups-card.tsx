"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { sourceGroupsQueryKey } from "@/components/topics/topic-query-keys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { SOURCE_GROUP_CONFIG } from "@/lib/source-groups/source-group-config";
import { sourceGroupFormSchema } from "@/lib/source-groups/schema";
import type {
  ListSourceGroupsResult,
  SourceGroupFormValues,
  SourceGroupListItem,
} from "@/lib/source-groups/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type WorkspaceSourceGroupsCardProps = {
  workspace: WorkspaceListItem;
};

async function fetchSourceGroups(
  workspaceId: string,
): Promise<ListSourceGroupsResult> {
  const res = await workspaceFetch(workspaceId, "/api/source-groups");
  const data = (await res.json()) as ListSourceGroupsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load source groups.");
  }

  return data;
}

function toFormValues(group?: SourceGroupListItem): SourceGroupFormValues {
  return {
    name: group?.name ?? "",
    description: group?.description ?? "",
  };
}

export function WorkspaceSourceGroupsCard({
  workspace,
}: WorkspaceSourceGroupsCardProps) {
  const queryClient = useQueryClient();
  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<
    SourceGroupListItem | undefined
  >();
  const [deleteTarget, setDeleteTarget] = useState<
    SourceGroupListItem | undefined
  >();
  const [moveToGroupId, setMoveToGroupId] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const groupsQuery = useQuery({
    queryKey: sourceGroupsQueryKey(workspace.id),
    queryFn: () => fetchSourceGroups(workspace.id),
  });

  const form = useForm<SourceGroupFormValues>({
    resolver: zodResolver(sourceGroupFormSchema),
    defaultValues: toFormValues(),
  });

  // Non-unassigned groups available as move targets (excludes the group being deleted).
  const allGroups = groupsQuery.data?.items ?? [];
  const groups = allGroups.filter((g) => !g.isUnassigned);
  const moveTargetGroups = deleteTarget
    ? groups.filter((g) => g.id !== deleteTarget.id)
    : groups;

  const isSubmitting = form.formState.isSubmitting;
  const nameError = form.formState.errors.name;
  const descriptionError = form.formState.errors.description;

  function openCreate() {
    setEditingGroup(undefined);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(group: SourceGroupListItem) {
    setEditingGroup(group);
    form.reset(toFormValues(group));
    setDialogOpen(true);
  }

  function openDelete(group: SourceGroupListItem) {
    setDeleteTarget(group);
    setMoveToGroupId("");
  }

  async function onSubmit(values: SourceGroupFormValues) {
    const body = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
    };

    const url = editingGroup
      ? `/api/source-groups/${editingGroup.id}`
      : "/api/source-groups";
    const method = editingGroup ? "PATCH" : "POST";

    const res = await workspaceFetch(workspace.id, url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { message?: string; error?: string };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save source group.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: editingGroup ? "Source group updated." : "Source group created.",
      type: "success",
    });
    setDialogOpen(false);
    await queryClient.invalidateQueries({
      queryKey: sourceGroupsQueryKey(workspace.id),
    });
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      const body: Record<string, string> = {};
      if (moveToGroupId) {
        body.moveToGroupId = moveToGroupId;
      }

      const res = await workspaceFetch(
        workspace.id,
        `/api/source-groups/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not delete source group.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Source group deleted.",
        type: "success",
      });
      setDeleteTarget(undefined);
      setMoveToGroupId("");
      await queryClient.invalidateQueries({
        queryKey: sourceGroupsQueryKey(workspace.id),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{SOURCE_GROUP_CONFIG.listTitle}</CardTitle>
            <CardDescription>{SOURCE_GROUP_CONFIG.listDescription}</CardDescription>
          </div>
          {canEdit ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              {SOURCE_GROUP_CONFIG.createLabel}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {groupsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading source groups…</p>
          ) : groupsQuery.error ? (
            <p className="text-sm text-destructive">
              {groupsQuery.error.message}
            </p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {SOURCE_GROUP_CONFIG.emptyDescription}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{group.name}</p>
                    {group.description ? (
                      <p className="text-sm text-muted-foreground">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${group.name}`}
                        onClick={() => openEdit(group)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${group.name}`}
                        onClick={() => openDelete(group)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit source group" : "Add source group"}
            </DialogTitle>
            <DialogDescription>
              Source groups let you filter trending topics by where documents
              came from.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={!!nameError || undefined}>
                <FieldLabel htmlFor="source-group-name">Name</FieldLabel>
                <Input
                  id="source-group-name"
                  autoComplete="off"
                  aria-invalid={!!nameError}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("name")}
                />
                <FieldError errors={[nameError]} />
              </Field>

              <Field data-invalid={!!descriptionError || undefined}>
                <FieldLabel htmlFor="source-group-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="source-group-description"
                  rows={3}
                  aria-invalid={!!descriptionError}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("description")}
                />
                <FieldDescription>Optional notes about this group.</FieldDescription>
                <FieldError errors={[descriptionError]} />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canEdit || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                    Saving…
                  </>
                ) : editingGroup ? (
                  "Save changes"
                ) : (
                  "Create group"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog — with optional move-to group selector */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(undefined);
            setMoveToGroupId("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              All jobs and documents currently in this group will be moved.
              Choose a destination below, or leave blank to move them to the
              auto-created <strong>Unassigned</strong> group.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {moveTargetGroups.length > 0 ? (
            <div className="px-1 pb-2">
              <label className="mb-1.5 block text-sm font-medium">
                Move to group <span className="text-muted-foreground">(optional)</span>
              </label>
              <Select value={moveToGroupId} onValueChange={setMoveToGroupId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned (auto-created)" />
                </SelectTrigger>
                <SelectContent>
                  {moveTargetGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
