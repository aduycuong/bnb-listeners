"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  MAX_GROUPS_PER_TERM,
  TERM_GROUP_CONFIG,
} from "@/lib/term-groups/term-group-config";
import type { TermGroupMemberItem } from "@/lib/term-groups/types";
import type { ListTermsResult, TermListItem } from "@/lib/terms/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermGroupAddMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  groupId: string;
  members: TermGroupMemberItem[];
  onAdded: () => Promise<void>;
};

async function searchTerms(
  workspaceId: string,
  search: string,
): Promise<TermListItem[]> {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("search", search.trim());
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/terms?${params.toString()}`,
  );
  const data = (await res.json()) as ListTermsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not search terms.");
  }

  return data.items;
}

export function TermGroupAddMembersDialog({
  open,
  onOpenChange,
  workspaceId,
  groupId,
  members,
  onAdded,
}: TermGroupAddMembersDialogProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<TermListItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const memberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearch("");
    setSelectedIds([]);
    setSearchResults([]);
    setSearchError(undefined);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearchLoading(true);
      setSearchError(undefined);

      try {
        const items = await searchTerms(workspaceId, deferredSearch);
        if (!cancelled) {
          setSearchResults(items);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchError(
            error instanceof Error ? error.message : "Could not search terms.",
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, open, workspaceId]);

  const visibleTerms = useMemo(
    () =>
      searchResults
        .filter((term) => !memberIds.has(term.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [memberIds, searchResults],
  );

  function toggleTerm(termId: string) {
    setSelectedIds((current) =>
      current.includes(termId)
        ? current.filter((id) => id !== termId)
        : [...current, termId],
    );
  }

  async function handleAdd() {
    if (selectedIds.length === 0) {
      return;
    }

    setSaving(true);

    try {
      const termIds = [...memberIds, ...selectedIds];
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
        toast.add({
          title: data.message ?? data.error ?? "Could not add members.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: data.message ?? "Terms added to group.",
        type: "success",
      });
      onOpenChange(false);
      await onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{TERM_GROUP_CONFIG.addMembersTitle}</DialogTitle>
          <DialogDescription>
            {TERM_GROUP_CONFIG.addMembersDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={TERM_GROUP_CONFIG.membersSearchPlaceholder}
            className="pl-8"
            aria-label="Search terms to add"
            disabled={saving}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {selectedIds.length} selected · max {MAX_GROUPS_PER_TERM} groups per
          term
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
          {searchError ? (
            <p className="p-4 text-sm text-destructive">{searchError}</p>
          ) : searchLoading && visibleTerms.length === 0 ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : visibleTerms.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {deferredSearch.trim()
                ? TERM_GROUP_CONFIG.addMembersSearchEmptyTitle
                : TERM_GROUP_CONFIG.addMembersEmptyTitle}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleTerms.map((term) => {
                const checked = selectedIds.includes(term.id);

                return (
                  <li key={term.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className={cn(
                          "mt-0.5 size-4 shrink-0 rounded border border-input",
                          saving && "cursor-not-allowed opacity-50",
                        )}
                        checked={checked}
                        disabled={saving}
                        onChange={() => toggleTerm(term.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {term.name}
                        </span>
                        {term.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {term.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || selectedIds.length === 0}
            onClick={handleAdd}
          >
            {saving ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Adding…
              </>
            ) : (
              TERM_GROUP_CONFIG.addMembersLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
