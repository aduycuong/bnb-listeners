import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel, type ChatModelId } from "@/lib/langchain";
import { TERM_BACKFILL_CONTENT_MAX_CHARS } from "@/lib/terms/term-backfill-config";

const evaluationItemSchema = z.object({
  documentId: z.uuid().describe("Document id from the provided list"),
  match: z.boolean().describe("True when the document belongs to the term"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence that this term applies, from 0.0 to 1.0"),
});

const evaluationResponseSchema = z.object({
  results: z
    .array(evaluationItemSchema)
    .describe("One evaluation per provided document"),
});

export type EvaluateDocumentInput = {
  id: string;
  title: string | null;
  rawContent: string;
  docType: string;
  sourceName: string;
};

export type DocumentTermEvaluation = z.infer<typeof evaluationItemSchema>;

export type EvaluateDocumentsForTopicResult = {
  results: DocumentTermEvaluation[];
  usage: { inputTokens: number; outputTokens: number };
};

function buildUserMessage(
  term: { name: string; description: string | null },
  documents: EvaluateDocumentInput[],
): string {
  const termDescription = term.description?.trim()
    ? `\nDescription: ${term.description.trim()}`
    : "";

  const documentBlocks = documents
    .map((doc, index) => {
      const contentPreview = doc.rawContent.slice(
        0,
        TERM_BACKFILL_CONTENT_MAX_CHARS,
      );

      return [
        `Document ${index + 1}:`,
        `id: ${doc.id}`,
        `Type: ${doc.docType}`,
        `Source: ${doc.sourceName}`,
        doc.title?.trim() ? `Title: ${doc.title.trim()}` : null,
        `Content:\n${contentPreview}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    "Term:",
    `Name: ${term.name.trim()}${termDescription}`,
    "",
    "Documents:",
    documentBlocks,
  ].join("\n");
}

/**
 * Evaluates whether each document belongs to a single term using the LLM.
 */
export async function evaluateDocumentsForTerm(
  term: { name: string; description: string | null },
  documents: EvaluateDocumentInput[],
  systemPrompt: string,
  model: ChatModelId,
): Promise<EvaluateDocumentsForTopicResult> {
  if (documents.length === 0) {
    return { results: [], usage: { inputTokens: 0, outputTokens: 0 } };
  }

  const chatModel = createChatModel(model, { temperature: 0 });
  const structured = chatModel.withStructuredOutput(evaluationResponseSchema, {
    includeRaw: true,
  });

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(term, documents)),
  ]);

  const parsed = evaluationResponseSchema.parse(response.parsed);
  const rawMessage = response.raw;
  const usageMetadata =
    rawMessage &&
    typeof rawMessage === "object" &&
    "usage_metadata" in rawMessage &&
    rawMessage.usage_metadata &&
    typeof rawMessage.usage_metadata === "object"
      ? rawMessage.usage_metadata
      : null;

  const inputTokens =
    usageMetadata &&
    "input_tokens" in usageMetadata &&
    typeof usageMetadata.input_tokens === "number"
      ? usageMetadata.input_tokens
      : 0;
  const outputTokens =
    usageMetadata &&
    "output_tokens" in usageMetadata &&
    typeof usageMetadata.output_tokens === "number"
      ? usageMetadata.output_tokens
      : 0;

  const allowedIds = new Set(documents.map((doc) => doc.id));

  return {
    results: parsed.results.filter((item) => allowedIds.has(item.documentId)),
    usage: { inputTokens, outputTokens },
  };
}
