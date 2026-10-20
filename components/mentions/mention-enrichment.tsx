"use client";

import { Badge } from "@/components/ui/badge";
import {
  EMOTION_LABELS,
  SENTIMENT_LABELS,
  type Emotion,
  type Sentiment,
} from "@/lib/enrichment/config";
import type { MentionListItem } from "@/lib/mentions/types";

const PRICE_UNITS: Record<string, string> = {
  trieu_m2: "triệu/m²",
  ty_can: "tỷ/căn",
  trieu_thang: "triệu/tháng",
  khac: "",
};

const PRICE_KINDS: Record<string, string> = {
  rao_ban: "rao bán",
  cho_thue: "cho thuê",
  gia_cdt: "giá CĐT",
  khac: "",
};

function describeExtraction(
  extraction: MentionListItem["extractions"][number],
  aspectByKey: Map<string, string>,
) {
  const data = extraction.data;
  if (extraction.schemaKey === "price_quote") {
    const parts = [
      `${data.amount ?? "?"} ${PRICE_UNITS[String(data.unit)] ?? ""}`.trim(),
      PRICE_KINDS[String(data.kind)],
      typeof data.area === "string" ? data.area : "",
    ].filter(Boolean);
    return `Giá: ${parts.join(", ")}`;
  }
  if (extraction.schemaKey === "buyer_question") {
    const topic = aspectByKey.get(String(data.topic)) ?? (data.topic === "other" ? "khác" : String(data.topic ?? ""));
    return `Câu hỏi (${topic}): ${String(data.question ?? "")}`;
  }
  return `${extraction.schemaKey}: ${JSON.stringify(data)}`;
}

/** Enrich output of one mention: sentiment, emotion, aspects and extracted fields. */
export function MentionEnrichment({
  mention,
  aspectNames,
}: {
  mention: MentionListItem;
  aspectNames: Map<string, { key: string; name: string }>;
}) {
  if (!mention.isRelevant) return null;
  if (mention.enrichStatus !== "done" && !mention.labelSentiment) {
    return (
      <p className="text-xs text-muted-foreground">
        {mention.enrichStatus === "failed" ? "Làm giàu lỗi, sẽ thử lại." : "Đang chờ làm giàu."}
      </p>
    );
  }

  const byKey = new Map([...aspectNames.values()].map((aspect) => [aspect.key, aspect.name]));
  const aspects =
    mention.labelAspectKeys !== null
      ? mention.labelAspectKeys.map((key) => ({
          key,
          name: byKey.get(key) ?? key,
        }))
      : mention.aspects.map((aspect) => ({
          key: aspect.aspectId,
          name: aspectNames.get(aspect.aspectId)?.name ?? "?",
        }));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {mention.sentiment ? (
          <Badge variant="outline">
            {SENTIMENT_LABELS[mention.sentiment as Sentiment] ?? mention.sentiment}
            {mention.labelSentiment ? " · nhãn" : ""}
          </Badge>
        ) : null}
        {mention.emotion ? (
          <Badge variant="outline">{EMOTION_LABELS[mention.emotion as Emotion] ?? mention.emotion}</Badge>
        ) : null}
        {aspects.map((aspect) => (
          <Badge key={aspect.key} variant="secondary">
            {aspect.name}
          </Badge>
        ))}
        {mention.topic ? <Badge variant="outline"># {mention.topic.name}</Badge> : null}
      </div>
      {mention.extractions.map((extraction, index) => (
        <p key={index} className="text-xs text-muted-foreground">
          {describeExtraction(extraction, byKey)}
        </p>
      ))}
    </div>
  );
}
