"use client";

import { Badge } from "@/components/ui/badge";
import {
  EMOTION_LABELS,
  SENTIMENT_LABELS,
  type Emotion,
  type Sentiment,
} from "@/lib/enrichment/config";
import { TERM_KIND_LABELS, type TermKind } from "@/lib/enrichment/registry";
import type { MentionListItem } from "@/lib/mentions/types";

import { MentionHintBadge } from "./mention-hint-badge";

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

function topicHintText(data: Record<string, unknown>) {
  return typeof data.text === "string" ? data.text.trim() : "";
}

function termRows(data: Record<string, unknown>) {
  if (!Array.isArray(data.items)) return [];
  return data.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const text = "text" in item && typeof item.text === "string" ? item.text.trim() : "";
    if (!text) return [];
    const kind = "kind" in item && typeof item.kind === "string" ? item.kind : "";
    const label = kind in TERM_KIND_LABELS ? TERM_KIND_LABELS[kind as TermKind] : kind;
    return [{ kind, label, text }];
  });
}

function priceLabel(data: Record<string, unknown>) {
  const parts = [
    `${data.amount ?? "?"} ${PRICE_UNITS[String(data.unit)] ?? ""}`.trim(),
    PRICE_KINDS[String(data.kind)],
    typeof data.area === "string" ? data.area : "",
  ].filter(Boolean);
  return parts.join(", ");
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
  const topicHints = mention.extractions.flatMap((extraction) => {
    if (extraction.schemaKey !== "topic_hint") return [];
    const text = topicHintText(extraction.data);
    return text ? [text] : [];
  });
  const terms = mention.extractions.flatMap((extraction) =>
    extraction.schemaKey === "terms" ? termRows(extraction.data) : [],
  );
  const prices = mention.extractions.flatMap((extraction) =>
    extraction.schemaKey === "price_quote" ? [priceLabel(extraction.data)] : [],
  );
  const questions = mention.extractions.flatMap((extraction) => {
    if (extraction.schemaKey !== "buyer_question") return [];
    const topic =
      byKey.get(String(extraction.data.topic)) ??
      (extraction.data.topic === "other" ? "khác" : String(extraction.data.topic ?? ""));
    const question = String(extraction.data.question ?? "").trim();
    return question ? [{ topic, question }] : [];
  });
  const hasOutput =
    Boolean(mention.sentiment || mention.emotion || mention.topic) ||
    aspects.length > 0 ||
    topicHints.length > 0 ||
    terms.length > 0 ||
    prices.length > 0 ||
    questions.length > 0;

  if (!hasOutput && mention.enrichStatus !== "done") {
    return (
      <p className="text-xs text-muted-foreground">
        {mention.enrichStatus === "failed" ? "Làm giàu lỗi, sẽ thử lại." : "Đang chờ làm giàu."}
      </p>
    );
  }

  const aspectHint =
    mention.labelAspectKeys !== null
      ? "Khía cạnh do người gán. Nhãn này được ưu tiên hơn kết quả tự động."
      : "Khía cạnh do hệ thống gán từ nội dung.";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {mention.sentiment ? (
        <MentionHintBadge
          tooltip={
            mention.labelSentiment
              ? "Cảm xúc do người gán. Nhãn này được ưu tiên hơn kết quả tự động."
              : "Cảm xúc do hệ thống gán: tích cực, trung tính hoặc tiêu cực."
          }
        >
          {SENTIMENT_LABELS[mention.sentiment as Sentiment] ?? mention.sentiment}
          {mention.labelSentiment ? " · nhãn" : ""}
        </MentionHintBadge>
      ) : null}
      {mention.emotion ? (
        <MentionHintBadge tooltip="Sắc thái cảm xúc do hệ thống gán, chi tiết hơn tích cực, trung tính hoặc tiêu cực.">
          {EMOTION_LABELS[mention.emotion as Emotion] ?? mention.emotion}
        </MentionHintBadge>
      ) : null}
      {aspects.map((aspect) => (
        <MentionHintBadge key={aspect.key} variant="secondary" tooltip={aspectHint}>
          {aspect.name}
        </MentionHintBadge>
      ))}
      {mention.topic ? (
        <MentionHintBadge tooltip="Chủ đề đã gom từ các gợi ý chủ đề giống nhau.">
          # {mention.topic.name}
        </MentionHintBadge>
      ) : null}
      {topicHints.map((text, index) => (
        <MentionHintBadge
          key={`${text}:${index}`}
          tooltip="Gợi ý chủ đề. Cụm ngắn hệ thống dùng để gom mention vào một chủ đề."
        >
          {text}
        </MentionHintBadge>
      ))}
      {terms.map((term, index) => (
        <MentionHintBadge
          key={`${term.kind}:${term.text}:${index}`}
          tooltip={`${term.label || "Từ ngữ"}. Từ ngữ được nhắc trong nội dung, trước khi vào chỉ mục.`}
        >
          {term.text}
        </MentionHintBadge>
      ))}
      {prices.map((price, index) => (
        <MentionHintBadge key={`${price}:${index}`} tooltip="Giá được trích từ nội dung: số tiền, loại giá và khu vực nếu có.">
          {price}
        </MentionHintBadge>
      ))}
      {questions.map((item, index) => (
        <MentionHintBadge
          key={`${item.question}:${index}`}
          tooltip={`Câu hỏi của người mua${item.topic ? ` · ${item.topic}` : ""}.`}
        >
          {item.question}
        </MentionHintBadge>
      ))}
      {!hasOutput ? (
        <Badge variant="outline" className="text-muted-foreground">
          Chưa có phân loại
        </Badge>
      ) : null}
    </div>
  );
}
