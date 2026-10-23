"use client";

import { ExternalLinkIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { HighlightTerms } from "./highlight-terms";
import { MentionLabelButtons } from "./mention-label-buttons";
import {
  KIND_LABELS,
  MATCH_TIER_LABELS,
  MATCH_TYPE_LABELS,
  formatDateTime,
} from "./mention-labels";
import { useMentionThread, useSetItemLabel, type MentionsApiScope } from "./use-mentions-api";

/** The whole thread of a mention, each item with its Match state and label. */
export function MentionThreadSheet({
  scope,
  rootId,
  focusId,
  canEdit,
  onClose,
  presentation = "sheet",
}: {
  scope: MentionsApiScope;
  rootId: string | null;
  focusId: string | null;
  canEdit: boolean;
  onClose: () => void;
  /** Admin mentions uses a dialog. Reports keep the side sheet. */
  presentation?: "sheet" | "dialog";
}) {
  const { data, isLoading } = useMentionThread(scope, rootId);
  const setLabel = useSetItemLabel(scope);
  const open = rootId !== null;
  const body = (
    <ThreadBody
      data={data}
      isLoading={isLoading}
      focusId={focusId}
      canEdit={canEdit}
      pending={setLabel.isPending}
      onLabel={(contentItemId, value) => setLabel.mutate({ contentItemId, isRelevant: value })}
    />
  );

  if (presentation === "dialog") {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="flex max-h-[min(85vh,52rem)] flex-col gap-4 overflow-hidden sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle>Thread</DialogTitle>
            <DialogDescription>
              Bài gốc và mọi bình luận. Mục không có nhãn mention là nội dung hệ thống không chọn.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">{body}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Thread</SheetTitle>
          <SheetDescription>
            Bài gốc và mọi bình luận. Mục không có nhãn mention là nội dung hệ thống không chọn.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-6">{body}</div>
      </SheetContent>
    </Sheet>
  );
}

function ThreadBody({
  data,
  isLoading,
  focusId,
  canEdit,
  pending,
  onLabel,
}: {
  data: ReturnType<typeof useMentionThread>["data"];
  isLoading: boolean;
  focusId: string | null;
  canEdit: boolean;
  pending: boolean;
  onLabel: (contentItemId: string, value: boolean | null) => void;
}) {
  return (
    <>
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Đang tải…
        </p>
      ) : null}
      {data?.items.map((item) => {
        const isRoot = item.contentItemId === data.rootId;
        const mention = item.mention;
        return (
          <div
            key={item.contentItemId}
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border px-3 py-2",
              isRoot ? "border-primary/40 bg-primary/5" : "border-border",
              !isRoot && item.parentId !== data.rootId && "ml-6",
              item.contentItemId === focusId && "ring-2 ring-primary",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{KIND_LABELS[item.kind] ?? item.kind}</span>
              <span>{item.authorName ?? "—"}</span>
              <span>· {formatDateTime(item.publishedAt)}</span>
              {mention ? (
                <>
                  <Badge variant={mention.isRelevant ? "default" : "secondary"}>
                    {mention.isRelevant ? "Có liên quan" : "Không liên quan"}
                  </Badge>
                  <Badge variant="outline">
                    {MATCH_TYPE_LABELS[mention.matchType]} · {MATCH_TIER_LABELS[mention.matchTier]}
                  </Badge>
                </>
              ) : (
                <Badge variant="outline">Không khớp</Badge>
              )}
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 hover:text-foreground"
                >
                  <ExternalLinkIcon className="size-3" /> Mở
                </a>
              ) : null}
            </div>
            <p className="text-sm whitespace-pre-line">
              <HighlightTerms text={item.text || "(không có chữ)"} terms={mention?.matchedTerms ?? []} />
            </p>
            {mention?.matchReason ? (
              <p className="text-xs text-muted-foreground">
                {mention.isRelevant ? "Lý do khớp" : "Lý do loại"}: {mention.matchReason}
              </p>
            ) : null}
            {canEdit ? (
              <MentionLabelButtons
                compact
                label={item.label}
                disabled={pending}
                onChange={(value) => onLabel(item.contentItemId, value)}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
