import { z } from "zod";

import {
  TERM_CARD_PERIOD_LABELS,
  TERM_CARD_PERIOD_PRESETS,
} from "@/lib/terms/term-card-config";

/** Preset keys exposed to MCP term tools (no custom — LLM cannot pass dates). */
export const MCP_TERM_PERIOD_KEYS = TERM_CARD_PERIOD_PRESETS.filter(
  (preset) => preset !== "custom",
);

const MCP_TERM_PERIOD_DESCRIPTION = MCP_TERM_PERIOD_KEYS.map(
  (key) => `${key} (${TERM_CARD_PERIOD_LABELS[key]})`,
).join(", ");

export const findTopTermsPeriodSchema = z
  .enum(MCP_TERM_PERIOD_KEYS)
  .describe(
    `Khoảng thời gian thống kê. Bắt buộc chọn một key: ${MCP_TERM_PERIOD_DESCRIPTION}.`,
  );
