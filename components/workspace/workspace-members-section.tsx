"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { AddWorkspaceMemberDialog } from "@/components/workspace/add-workspace-member-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type {
  ListWorkspaceMembersResult,
  WorkspaceMemberListItem,
  WorkspaceListItem,
} from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type WorkspaceMembersSectionProps = {
  workspace: WorkspaceListItem;
};

type MemberToRemove = {
  userId: string;
  label: string;
};

async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<ListWorkspaceMembersResult> {
  const res = await workspaceFetch(workspaceId, "/api/workspace-members");
  const data = (await res.json()) as ListWorkspaceMembersResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load members.");
  }

  return data;
}

function getInitials(member: WorkspaceMemberListItem) {
  if (member.displayName?.trim()) {
    return member.displayName.trim().charAt(0).toUpperCase();
  }

  return member.email.charAt(0).toUpperCase();
}

function getMemberLabel(member: WorkspaceMemberListItem) {
  return member.displayName?.trim() || member.email;
}

export function WorkspaceMembersSection({
  workspace,
}: WorkspaceMembersSectionProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberToRemove | null>(
    null,
  );
  const [removing, setRemoving] = useState(false);

  const isOwner = workspace.permission === "owner";

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace-members", workspace.id],
    queryFn: () => fetchWorkspaceMembers(workspace.id),
  });

  const members = data?.items ?? [];
  const ownerCount = members.filter(
    (member) => member.permission === "owner",
  ).length;

  function canRemoveMember(member: WorkspaceMemberListItem) {
    return !(member.permission === "owner" && ownerCount <= 1);
  }

  async function refreshMembers() {
    await queryClient.invalidateQueries({
      queryKey: ["workspace-members", workspace.id],
    });
  }

  async function handleRemoveMember() {
    if (!memberToRemove) {
      return;
    }

    setRemoving(true);

    try {
      const res = await workspaceFetch(
        workspace.id,
        `/api/workspace-members/${memberToRemove.userId}`,
        { method: "DELETE" },
      );
      const responseData = (await res.json()) as {
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        toast.add({
          title:
            responseData.error ??
            responseData.message ??
            "Could not remove member.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: responseData.message ?? "Member removed.",
        type: "success",
      });
      setMemberToRemove(null);
      await refreshMembers();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {isOwner
                ? "Add or remove members. The last owner cannot be removed."
                : "Everyone with access to this workspace."}
            </CardDescription>
          </div>
          {isOwner ? (
            <Button className="shrink-0" onClick={() => setAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add member
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : error?.message ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar size="default">
                    {member.avatarUrl ? (
                      <AvatarImage src={member.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{getInitials(member)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {getMemberLabel(member)}
                    </p>
                    {member.displayName ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm capitalize text-muted-foreground">
                      {member.permission === "owner"
                        ? "Owner"
                        : member.permission}
                    </span>
                    {isOwner && canRemoveMember(member) ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${getMemberLabel(member)}`}
                        onClick={() =>
                          setMemberToRemove({
                            userId: member.userId,
                            label: getMemberLabel(member),
                          })
                        }
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddWorkspaceMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaceId={workspace.id}
        onAdded={refreshMembers}
      />

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove ? (
                <>
                  <span className="font-medium text-foreground">
                    {memberToRemove.label}
                  </span>{" "}
                  will lose access to this workspace. This action cannot be
                  undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removing}
              onClick={handleRemoveMember}
            >
              {removing ? (
                <>
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  Removing…
                </>
              ) : (
                "Remove member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
