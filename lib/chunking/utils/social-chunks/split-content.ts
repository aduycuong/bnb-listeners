import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import {
  CHUNK_OVERLAP_CHARACTERS,
  CHUNK_TARGET_CHARACTERS,
} from "../../config";
import { MIN_CONTENT_BUDGET } from "./config";

export type SplitContentParams = {
  content: string;
  /** Length of the context prefix repeated on every part; deducted from the budget. */
  contextPrefixLength: number;
  atomicMaxCharacters: number;
};

/**
 * Splits post text into parts, without the context prefix — the caller applies
 * that once so the sizing math stays in one place.
 *
 * A post shorter than `atomicMaxCharacters` comes back as a single part:
 * splitting a social post mid-argument destroys the thing that makes it
 * retrievable. Longer content falls back to overlapping character splits sized
 * against CHUNK_TARGET_CHARACTERS minus the prefix overhead.
 */
export async function splitContent(
  params: SplitContentParams,
): Promise<string[]> {
  const { content, contextPrefixLength, atomicMaxCharacters } = params;

  const trimmed = content.trim();
  if (!trimmed) return [];
  if (trimmed.length <= atomicMaxCharacters) return [trimmed];

  // Two extra characters cover the blank line between prefix and content.
  const contentBudget = Math.max(
    MIN_CONTENT_BUDGET,
    CHUNK_TARGET_CHARACTERS - contextPrefixLength - 2,
  );

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: contentBudget,
    chunkOverlap: Math.min(
      CHUNK_OVERLAP_CHARACTERS,
      Math.floor(contentBudget / 4),
    ),
  });

  return splitter.splitText(trimmed);
}
