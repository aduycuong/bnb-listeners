import { TRANSCRIPT_CORRECTION_CONFIG } from "../config";
import type {
  CorrectTranscriptResult,
  DroppedTranscriptReplacement,
  TranscriptGlossaryTerm,
  TranscriptReplacement,
} from "../types";
import { nameSimilarity } from "./name-similarity";

/**
 * Applies the model's replacements that pass the checks: the phrase is in the
 * transcript, the new text is a glossary name or alias, and the two read
 * alike. Each accepted phrase is replaced everywhere it occurs.
 */
export function applyTranscriptReplacements(params: {
  transcript: string;
  replacements: TranscriptReplacement[];
  glossary: TranscriptGlossaryTerm[];
}): CorrectTranscriptResult {
  const names = new Set(params.glossary.flatMap((term) => [term.name, ...term.aliases]));
  const applied: TranscriptReplacement[] = [];
  const dropped: DroppedTranscriptReplacement[] = [];
  let text = params.transcript;

  // Longest phrases first, so "chelia vita" is not cut short by "chelia".
  const replacements = [...params.replacements].sort((a, b) => b.from.length - a.from.length);

  for (const { from, to } of replacements) {
    const phrase = from.trim();
    if (!phrase || phrase === to || applied.some((entry) => entry.from === phrase)) continue;

    if (!names.has(to)) {
      dropped.push({ from: phrase, to, reason: "not a glossary name" });
    } else if (!text.includes(phrase)) {
      dropped.push({ from: phrase, to, reason: "not in transcript" });
    } else if (nameSimilarity(phrase, to) < TRANSCRIPT_CORRECTION_CONFIG.minNameSimilarity) {
      dropped.push({ from: phrase, to, reason: "not alike" });
    } else {
      text = text.split(phrase).join(to);
      applied.push({ from: phrase, to });
    }
  }

  return { text, applied, dropped };
}
