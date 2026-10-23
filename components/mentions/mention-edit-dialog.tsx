"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MentionListItem } from "@/lib/mentions/types";

import { SentimentAspectPicker } from "./sentiment-aspect-picker";

/** Sentiment and aspect corrections for one relevant mention. */
export function MentionEditDialog({
  mention,
  aspects,
  aspectNames,
  pending,
  onClose,
  onSentiment,
  onAspects,
}: {
  mention: MentionListItem | null;
  aspects: { key: string; name: string }[];
  aspectNames: Map<string, { key: string; name: string }>;
  pending: boolean;
  onClose: () => void;
  onSentiment: (mention: MentionListItem, sentiment: "positive" | "neutral" | "negative") => void;
  onAspects: (mention: MentionListItem, aspectKeys: string[]) => void;
}) {
  return (
    <Dialog open={mention !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Sửa cảm xúc và khía cạnh</DialogTitle>
          <DialogDescription>
            Nhãn này được ưu tiên hơn kết quả tự động. Dùng Reset auto trong menu để bỏ nhãn.
          </DialogDescription>
        </DialogHeader>
        {mention ? (
          <SentimentAspectPicker
            aspects={aspects}
            sentiment={mention.labelSentiment ?? mention.sentiment}
            aspectKeys={
              mention.labelAspectKeys ??
              mention.aspects
                .map((aspect) => aspectNames.get(aspect.aspectId)?.key)
                .filter((key): key is string => Boolean(key))
            }
            disabled={pending}
            onSentiment={(sentiment) => onSentiment(mention, sentiment)}
            onAspects={(aspectKeys) => onAspects(mention, aspectKeys)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
