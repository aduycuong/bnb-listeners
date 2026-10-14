import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import type { ChatModelId } from "@/lib/langchain/models/registry";

import { SYNTHETIC_CONFIG } from "../config";
import type { PlannedThread, SourceStyleSample } from "../types";
import { buildThreadPrompt } from "../utils/build-thread-prompt";

const responseSchema = z.object({
  items: z
    .array(
      z.object({
        index: z.int().describe("The [n] index of the item being written"),
        text: z.string().describe("The post or comment text, in Vietnamese"),
      }),
    )
    .describe("One entry per requested item"),
});

type WriteThreadTextsParams = {
  thread: PlannedThread;
  brief: string;
  samples: SourceStyleSample[];
  model: ChatModelId;
};

/**
 * Asks the model to write every non-noise item of one thread in a single call.
 * Returns text by item index, or null when the model could not produce all
 * of them within the allowed attempts; the caller drops the thread then.
 * A missing API key throws instead of being retried.
 */
export async function writeThreadTexts(
  params: WriteThreadTextsParams,
): Promise<Map<number, string> | null> {
  const prompt = buildThreadPrompt(params);
  if (prompt.indexes.length === 0) return new Map();

  const model = createChatModel(params.model, {
    temperature: SYNTHETIC_CONFIG.temperature,
    maxTokens: SYNTHETIC_CONFIG.maxOutputTokens,
  });
  const structured = model.withStructuredOutput(responseSchema);

  for (let attempt = 1; attempt <= SYNTHETIC_CONFIG.threadAttempts; attempt++) {
    try {
      const response = await structured.invoke([
        new SystemMessage(prompt.system),
        new HumanMessage(prompt.user),
      ]);

      const texts = new Map<number, string>();
      for (const entry of response.items) {
        const text = entry.text.trim();
        if (text) texts.set(entry.index, text);
      }

      if (prompt.indexes.every((index) => texts.has(index))) return texts;

      console.warn("[synthetic-threads] incomplete thread", {
        thread: params.thread.index,
        attempt,
        missing: prompt.indexes.filter((index) => !texts.has(index)),
      });
    } catch (error) {
      console.warn("[synthetic-threads] thread call failed", {
        thread: params.thread.index,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}
