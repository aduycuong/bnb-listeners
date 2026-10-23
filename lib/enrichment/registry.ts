import { z } from "zod";

import type { ChatModelId } from "@/lib/langchain/models/registry";

/**
 * Every enricher the system knows (docs/decisions.md D18). Safe to import
 * from the client: metadata and zod schemas only. The server-side
 * implementations live in `./enrichers/`.
 *
 * - `llm` enrichers share one model call per thread; each has its own
 *   version and signature, so bumping one does not rerun the others.
 * - `stage` enrichers are code (or a separate model stage) that run after
 *   the LLM pass on the raw output named in `requires`.
 * - `planned` enrichers can be named by a case template and shown as
 *   "coming soon"; they are never scheduled.
 */
export const ENRICHER_STATUSES = ["ready", "planned"] as const;
export type EnricherStatus = (typeof ENRICHER_STATUSES)[number];

export const TERM_KINDS = ["keyword", "place", "brand", "org"] as const;
export type TermKind = (typeof TERM_KINDS)[number];

export const TERM_KIND_LABELS: Record<TermKind, string> = {
  keyword: "Từ khóa",
  place: "Địa danh",
  brand: "Dự án, thương hiệu",
  org: "Tổ chức, văn bản",
};

export const PRICE_UNITS = ["trieu_m2", "ty_can", "trieu_thang", "khac"] as const;
export const PRICE_KINDS = ["rao_ban", "cho_thue", "gia_cdt", "khac"] as const;

export const priceQuoteSchema = z.object({
  amount: z
    .number()
    .describe('Số tiền theo đơn vị ở `unit`, chỉ phần số. Dấu phẩy trong tiếng Việt là dấu thập phân: "2,4 tỷ" là 2.4, "46tr/m2" là 46'),
  unit: z.enum(PRICE_UNITS).describe("triệu/m², tỷ/căn, triệu/tháng (giá thuê) hoặc khác"),
  kind: z.enum(PRICE_KINDS).describe("Giá rao bán lại, giá cho thuê, giá chủ đầu tư công bố, hoặc khác"),
  quote: z.string().describe("Đoạn văn bản nhắc tới giá, giữ nguyên"),
  area: z.string().nullable().describe("Khu vực hoặc dự án của mức giá nếu văn bản nêu, null nếu không rõ"),
});

export const buyerQuestionSchema = z.object({
  topic: z.string().describe("Khía cạnh của câu hỏi"),
  question: z.string().describe("Câu hỏi, viết gọn"),
});

/** Raw `topic_hint` row in `mention_extractions`. */
export const topicHintSchema = z.object({ text: z.string() });

/** Raw `terms` row in `mention_extractions`: what the model named, before the index stage. */
export const termsSchema = z.object({
  items: z.array(z.object({ kind: z.enum(TERM_KINDS), text: z.string() })),
});

/** A case-specific field stored as jsonb in `mention_extractions`. */
export type ExtractionSpec = {
  /** Instruction for the prompt. */
  description: string;
  /** True: zero or more per mention. False: at most one. */
  many: boolean;
  schema: z.ZodObject<z.ZodRawShape>;
  /** Field filled with one of the project's aspect keys (or `other`). */
  aspectField?: string;
  /** When this extraction feeds a grouping stage (`topics.kind`). */
  stage?: {
    enricherKey: string;
    topicKind: string;
  };
};

type BaseSpec = {
  version: number;
  status: EnricherStatus;
  label: string;
  /** Table the output goes to, for documentation and the reset script. */
  writes: string;
};

export type LlmEnricherSpec = BaseSpec & {
  kind: "llm";
  /** Set for extraction enrichers; the built-in ones (sentiment, aspects, …) have their own code. */
  extraction?: ExtractionSpec;
};

export type StageEnricherSpec = BaseSpec & {
  kind: "stage";
  /** Raw outputs this stage reads; it runs after they are done. */
  requires: string[];
  /** Model of a model stage; null for code stages. */
  model: ChatModelId | null;
};

export type EnricherSpec = LlmEnricherSpec | StageEnricherSpec;

export const ENRICHER_REGISTRY = {
  sentiment: {
    kind: "llm",
    version: 7,
    status: "ready",
    label: "Cảm xúc",
    writes: "mention_sentiments",
  },
  aspects: {
    kind: "llm",
    version: 7,
    status: "ready",
    label: "Khía cạnh",
    writes: "mention_aspects",
  },
  entities: {
    kind: "llm",
    version: 7,
    status: "ready",
    label: "Đối tượng được nhắc",
    writes: "mention_entities",
  },
  topic_hint: {
    kind: "llm",
    version: 4,
    status: "ready",
    label: "Gợi ý chủ đề",
    writes: "mention_extractions",
  },
  terms: {
    kind: "llm",
    version: 1,
    status: "ready",
    label: "Từ ngữ được nhắc",
    writes: "mention_extractions",
  },
  price_quote: {
    kind: "llm",
    version: 3,
    status: "ready",
    label: "Giá được nhắc",
    writes: "mention_extractions",
    extraction: {
      description:
        "Mỗi mức giá cụ thể được nhắc tới (rao bán, cho thuê, giá chủ đầu tư), kèm khu vực hoặc dự án của mức giá nếu xác định được. Bỏ qua nếu không có con số.",
      many: true,
      schema: priceQuoteSchema,
    },
  },
  buyer_question: {
    kind: "llm",
    version: 1,
    status: "ready",
    label: "Câu hỏi của người mua",
    writes: "mention_extractions",
    extraction: {
      description: "Khi mục là câu hỏi của người đang cân nhắc mua hoặc thuê: chủ đề và câu hỏi.",
      many: false,
      schema: buyerQuestionSchema,
      aspectField: "topic",
      stage: { enricherKey: "question_assign", topicKind: "buyer_question" },
    },
  },
  buyer_intent: {
    kind: "llm",
    version: 0,
    status: "planned",
    label: "Ý định của người mua",
    writes: "mention_extractions",
  },
  concern: {
    kind: "llm",
    version: 0,
    status: "planned",
    label: "Mối lo của người mua",
    writes: "mention_extractions",
  },
  violation: {
    kind: "llm",
    version: 0,
    status: "planned",
    label: "Vi phạm của sàn",
    writes: "mention_extractions",
  },
  stance: {
    kind: "llm",
    version: 0,
    status: "planned",
    label: "Luận điểm",
    writes: "mention_extractions",
  },
  terms_index: {
    kind: "stage",
    version: 1,
    status: "ready",
    label: "Chỉ mục từ ngữ",
    writes: "mention_terms",
    requires: ["terms"],
    model: null,
  },
  topic_assign: {
    kind: "stage",
    version: 2,
    status: "ready",
    label: "Gom chủ đề",
    writes: "mention_topics",
    requires: ["topic_hint"],
    model: "gpt-4.1",
  },
  question_assign: {
    kind: "stage",
    version: 1,
    status: "ready",
    label: "Gom câu hỏi thường gặp",
    writes: "mention_topics",
    requires: ["buyer_question"],
    model: "gpt-4.1",
  },
} as const satisfies Record<string, EnricherSpec>;

export type EnricherKey = keyof typeof ENRICHER_REGISTRY;

export const ENRICHER_KEYS = Object.keys(ENRICHER_REGISTRY) as EnricherKey[];

/** Enrichers every case runs; case templates add their own on top (D18). */
export const CORE_ENRICHERS: readonly EnricherKey[] = [
  "sentiment",
  "aspects",
  "entities",
  "topic_hint",
  "terms",
  "terms_index",
  "topic_assign",
];

export function isEnricherKey(value: string): value is EnricherKey {
  return value in ENRICHER_REGISTRY;
}

/** Ready LLM enrichers whose output is a `mention_extractions.schema_key`. */
export function listReadyExtractionSchemas(): { key: EnricherKey; label: string }[] {
  return ENRICHER_KEYS.flatMap((key) => {
    const spec = ENRICHER_REGISTRY[key];
    return spec.kind === "llm" && spec.status === "ready" && spec.writes === "mention_extractions"
      ? [{ key, label: spec.label }]
      : [];
  });
}

export function isReadyExtractionSchemaKey(value: string): value is EnricherKey {
  return listReadyExtractionSchemas().some((item) => item.key === value);
}

export function getEnricherSpec(key: EnricherKey): EnricherSpec {
  return ENRICHER_REGISTRY[key];
}

export function isReadyEnricher(key: EnricherKey): boolean {
  return ENRICHER_REGISTRY[key].status === "ready";
}

/** Keys a case template names, in registry order, with their status. */
export function describeEnrichers(keys: readonly EnricherKey[]) {
  return ENRICHER_KEYS.filter((key) => keys.includes(key)).map((key) => ({
    key,
    ...ENRICHER_REGISTRY[key],
  }));
}
