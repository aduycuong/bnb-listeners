"use client";

import { Loader2Icon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TermGroupAddMembersDialog } from "@/components/term-groups/term-group-add-members-dialog";
import { TermGroupMemberRebuildDialog } from "@/components/term-groups/term-group-member-rebuild-dialog";
import { TermGroupMemberRebuildStatus } from "@/components/term-groups/term-group-member-rebuild-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { TERM_GROUP_CONFIG } from "@/lib/term-groups/term-group-config";
import type {
  ListTermGroupMembersResult,
  TermGroupDetail,
} from "@/lib/term-groups/types";
import { getTermHref } from "@/lib/terms/term-config";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermGroupMembersSectionProps = {
  workspaceId: string;
  workspaceIndex: number;
  groupId: string;
  group?: TermGroupDetail;
  canEdit: boolean;
  members?: ListTermGroupMembersResult;
  isLoading?: boolean;
  errorMessage?: string;
  onSaved: () => Promise<void>;
};

export function TermGroupMembersSection({
  workspaceId,
  workspaceIndex,
  groupId,
  group,
  canEdit,
  members,
  isLoading = false,
  errorMessage,
  onSaved,
}: TermGroupMembersSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string>();

  const memberItems = members?.items ?? [];
  const hasActiveRebuild = Boolean(group?.activeMemberRebuildRun);

  async function updateMembers(termIds: string[]) {
    const res = await workspaceFetch(
      workspaceId,
      `/api/term-groups/${groupId}/members`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termIds }),
      },
    );
    const data = (await res.json()) as {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(data.message ?? data.error ?? "Could not update members.");
    }

    return data.message;
  }

  async function handleRemove(termId: string) {
    setRemovingId(termId);

    try {
      const termIds = memberItems
        .map((item) => item.id)
        .filter((id) => id !== termId);
      const message = await updateMembers(termIds);

      toast.add({
        title: message ?? "Term removed from group.",
        type: "success",
      });
      await onSaved();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : "Could not remove term from group.",
        type: "error",
      });
    } finally {
      setRemovingId(undefined);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{TERM_GROUP_CONFIG.membersTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {TERM_GROUP_CONFIG.membersListDescription}
              </p>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isLoading || hasActiveRebuild || !group}
                  onClick={() => setRebuildOpen(true)}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  {TERM_GROUP_CONFIG.rebuildMembersLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => setAddOpen(true)}
                >
                  <PlusIcon data-icon="inline-start" />
                  {TERM_GROUP_CONFIG.addMembersLabel}
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {group?.activeMemberRebuildRun ? (
            <TermGroupMemberRebuildStatus
              workspaceId={workspaceId}
              groupId={groupId}
              run={group.activeMemberRebuildRun}
              onUpdated={onSaved}
            />
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : memberItems.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center">
              <p className="text-sm font-medium">
                {TERM_GROUP_CONFIG.membersEmptyTitle}
              </p>
              {canEdit ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {TERM_GROUP_CONFIG.membersEmptyDescription}
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {memberItems.map((term) => {
                const isRemoving = removingId === term.id;

                return (
                  <li
                    key={term.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <Link
                        href={getTermHref(workspaceIndex, term.id)}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <p className="text-sm font-semibold">{term.name}</p>
                        {term.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {term.description}
                          </p>
                        ) : null}
                      </Link>

                      {canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(removingId)}
                          onClick={() => handleRemove(term.id)}
                        >
                          {isRemoving ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <Trash2Icon data-icon="inline-start" />
                          )}
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <>
          <TermGroupAddMembersDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            workspaceId={workspaceId}
            groupId={groupId}
            members={memberItems}
            onAdded={onSaved}
          />

          {group ? (
            <TermGroupMemberRebuildDialog
              open={rebuildOpen}
              onOpenChange={setRebuildOpen}
              workspaceId={workspaceId}
              group={group}
              onStarted={onSaved}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
