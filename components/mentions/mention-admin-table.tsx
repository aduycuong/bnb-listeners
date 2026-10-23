"use client";

import { EllipsisIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MentionListItem } from "@/lib/mentions/types";
import { cn } from "@/lib/utils";

import { MentionEditDialog } from "./mention-edit-dialog";
import { MentionEnrichment } from "./mention-enrichment";
import { MentionExpandableText } from "./mention-expandable-text";
import { MentionHintBadge } from "./mention-hint-badge";
import {
  KIND_LABELS,
  MATCH_TIER_HINTS,
  MATCH_TIER_LABELS,
  MATCH_TYPE_HINTS,
  MATCH_TYPE_LABELS,
  formatDateTime,
} from "./mention-labels";
import { useSetItemLabel, type MentionsApiScope } from "./use-mentions-api";

/** Admin mentions as one full-width row per mention. */
export function MentionAdminTable({
  scope,
  items,
  loading = false,
  empty,
  canEdit,
  entityNames,
  aspectNames,
  aspects,
  onOpenThread,
}: {
  scope: MentionsApiScope;
  items: MentionListItem[];
  loading?: boolean;
  empty: boolean;
  canEdit: boolean;
  entityNames: Map<string, string>;
  aspectNames: Map<string, { key: string; name: string }>;
  aspects: { key: string; name: string }[];
  onOpenThread: (mention: MentionListItem) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const setLabel = useSetItemLabel(scope);
  const editing = items.find((item) => item.id === editingId) ?? null;

  return (
    <>
      <Table className="text-[13px]">
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell className="py-8 text-center text-muted-foreground">Đang tải…</TableCell>
            </TableRow>
          ) : empty ? (
            <TableRow>
              <TableCell className="py-8 text-center text-muted-foreground">
                Không có mention nào khớp bộ lọc.
              </TableCell>
            </TableRow>
          ) : (
            items.map((mention) => (
              <TableRow key={mention.id}>
                <TableCell
                  className={cn(
                    "px-3 py-3 whitespace-normal",
                    isManualMention(mention) && "border-l-4 border-l-amber-500 bg-amber-500/10",
                  )}
                >
                  <MentionRow
                    mention={mention}
                    canEdit={canEdit}
                    pending={setLabel.isPending}
                    entityNames={entityNames}
                    aspectNames={aspectNames}
                    onEdit={() => setEditingId(mention.id)}
                    onRelevant={(isRelevant) =>
                      setLabel.mutate({ contentItemId: mention.contentItemId, isRelevant })
                    }
                    onReset={() => setLabel.mutate({ contentItemId: mention.contentItemId, isRelevant: null })}
                    onOpenThread={() => onOpenThread(mention)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <MentionEditDialog
        mention={editing}
        aspects={aspects}
        aspectNames={aspectNames}
        pending={setLabel.isPending}
        onClose={() => setEditingId(null)}
        onSentiment={(mention, sentiment) =>
          setLabel.mutate({
            contentItemId: mention.contentItemId,
            isRelevant: mention.label ?? true,
            sentiment,
          })
        }
        onAspects={(mention, aspectKeys) =>
          setLabel.mutate({
            contentItemId: mention.contentItemId,
            isRelevant: mention.label ?? true,
            aspectKeys,
          })
        }
      />
    </>
  );
}

function isManualMention(mention: MentionListItem) {
  return mention.userCorrected || mention.label !== null || mention.matchTier === "user";
}

function MentionRow({
  mention,
  canEdit,
  pending,
  entityNames,
  aspectNames,
  onEdit,
  onRelevant,
  onReset,
  onOpenThread,
}: {
  mention: MentionListItem;
  canEdit: boolean;
  pending: boolean;
  entityNames: Map<string, string>;
  aspectNames: Map<string, { key: string; name: string }>;
  onEdit: () => void;
  onRelevant: (isRelevant: boolean) => void;
  onReset: () => void;
  onOpenThread: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{mention.authorName ?? "Ẩn danh"}</span>
            <span>
              {KIND_LABELS[mention.kind] ?? mention.kind}
              <span className="mx-1">·</span>
              {mention.sourceName ?? "—"}
              <span className="mx-1">·</span>
              {formatDateTime(mention.publishedAt)}
            </span>
            <CopyId label="Mention" value={mention.id} />
            <CopyId label="Mục" value={mention.contentItemId} />
            {mention.url ? (
              <a
                href={mention.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 hover:text-foreground"
              >
                <ExternalLinkIcon className="size-3" /> Mở nguồn
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            <MentionHintBadge
              tooltip={`${MATCH_TYPE_HINTS[mention.matchType] ?? "Cách mention được chọn."} ${MATCH_TIER_HINTS[mention.matchTier] ?? ""}`.trim()}
            >
              {MATCH_TYPE_LABELS[mention.matchType]} · {MATCH_TIER_LABELS[mention.matchTier]}
            </MentionHintBadge>
            {!mention.isRelevant ? (
              <MentionHintBadge variant="secondary" tooltip="Mention bị loại, không tính vào báo cáo.">
                Không liên quan
              </MentionHintBadge>
            ) : null}
            {mention.label !== null ? (
              <MentionHintBadge
                tooltip={
                  mention.label
                    ? "Người đã gán nhãn: có liên quan."
                    : "Người đã gán nhãn: không liên quan."
                }
              >
                Đã gán nhãn
              </MentionHintBadge>
            ) : null}
            {mention.matchedEntityIds.map((id) =>
              entityNames.get(id) ? (
                <MentionHintBadge key={id} tooltip="Đối tượng của project được nhắc trong mention này.">
                  {entityNames.get(id)}
                </MentionHintBadge>
              ) : null,
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="xs" variant="ghost" onClick={onOpenThread}>
            Xem thread
          </Button>
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Thêm thao tác"
                    disabled={pending}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {mention.isRelevant ? (
                  <>
                    <DropdownMenuItem disabled={pending} onClick={() => onRelevant(false)}>
                      Không liên quan
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={pending} onClick={onEdit}>
                      Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={pending || !isManualMention(mention)} onClick={onReset}>
                      Reset auto
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem disabled={pending} onClick={() => onRelevant(true)}>
                      Có liên quan
                    </DropdownMenuItem>
                    {isManualMention(mention) ? (
                      <DropdownMenuItem disabled={pending} onClick={onReset}>
                        Reset auto
                      </DropdownMenuItem>
                    ) : null}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {mention.rootText ? (
        <p className="line-clamp-2 border-l-2 border-border pl-2 text-xs text-muted-foreground">
          Trong bài: {mention.rootText}
        </p>
      ) : null}
      <MentionExpandableText text={mention.text} terms={mention.matchedTerms} />
      {mention.matchReason ? (
        <p className="text-xs text-muted-foreground">
          {mention.isRelevant ? "Lý do khớp" : "Lý do loại"}: {mention.matchReason}
        </p>
      ) : null}
      <MentionEnrichment mention={mention} aspectNames={aspectNames} />
    </div>
  );
}

function CopyId({ label, value }: { label: string; value: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="block max-w-36 truncate text-left font-mono text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              void navigator.clipboard.writeText(value).then(
                () => toast.add({ title: `Đã sao chép ${label}`, type: "success" }),
                () => toast.add({ title: "Không sao chép được ID", type: "error" }),
              );
            }}
          >
            {label} {value.slice(0, 8)}
          </button>
        }
      />
      <TooltipContent>
        {label}: {value}. Bấm để sao chép.
      </TooltipContent>
    </Tooltip>
  );
}
