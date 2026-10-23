import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { type ChatModelId, createChatModel } from "@/lib/langchain";

import { TRANSCRIPT_CORRECTION_CONFIG } from "../config";
import type { CorrectTranscriptResult, TranscriptGlossaryTerm } from "../types";
import { applyTranscriptReplacements } from "../utils/apply-transcript-replacements";
import { buildTranscriptCorrectionPrompt } from "../utils/build-transcript-correction-prompt";

const responseSchema = z.object({
  replacements: z
    .array(
      z.object({
        from: z.string().describe("The misheard phrase, copied exactly from the transcript"),
        to: z.string().describe("The name from the list it should be"),
      }),
    )
    .describe("Misheard names; empty when there are none"),
});

/**
 * Fixes misheard glossary names in a transcript with one model call. Only
 * Vietnamese transcripts are corrected; the model names the replacements and
 * `applyTranscriptReplacements` decides which to apply.
 */
export async function correctTranscript(params: {
  transcript: string;
  glossary: TranscriptGlossaryTerm[];
  language?: string | null;
  /** Defaults to `TRANSCRIPT_CORRECTION_CONFIG.model`; the probe compares others. */
  model?: ChatModelId;
}): Promise<CorrectTranscriptResult & { suggested: number }> {
  const transcript = params.transcript.trim();
  const isVietnamese = !params.language || params.language.toLowerCase().startsWith("vi");
  if (!transcript || params.glossary.length === 0 || !isVietnamese) {
    return { text: transcript, applied: [], dropped: [], suggested: 0 };
  }

  const model = createChatModel(params.model ?? TRANSCRIPT_CORRECTION_CONFIG.model, {
    temperature: 0,
  }).withStructuredOutput(responseSchema);
  const prompt = buildTranscriptCorrectionPrompt({ transcript, glossary: params.glossary });
  const response = await model.invoke([new SystemMessage(prompt.system), new HumanMessage(prompt.user)]);

  return {
    ...applyTranscriptReplacements({
      transcript,
      replacements: response.replacements,
      glossary: params.glossary,
    }),
    suggested: response.replacements.length,
  };
}
