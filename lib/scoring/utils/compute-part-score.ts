import { PART_DETAIL_MIN, PART_RELEVANCE_MIN } from "../config";

/** Combined part score: plain average of the two LLM dimensions, 4 dp. */
export function computePartScore(relevance: number, detail: number): number {
  const raw = (relevance + detail) / 2;
  return Math.round(Math.min(1, Math.max(0, raw)) * 10_000) / 10_000;
}

/** Both dimensions must clear their own threshold — a strong one cannot compensate. */
export function isPartEligible(relevance: number, detail: number): boolean {
  return relevance >= PART_RELEVANCE_MIN && detail >= PART_DETAIL_MIN;
}
