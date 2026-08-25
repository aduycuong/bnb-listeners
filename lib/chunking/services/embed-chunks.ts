import { eq } from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";

import { documents } from "@/db/schema";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/common/service-errors";

import { EMBEDDING_MODEL } from "../config";
import { getChunkStrategy } from "../registry";
import type { ChunkStrategy, DocumentChunk, EmbedChunksResult } from "../types";
import { chunkContractByArticle } from "../utils/chunk-contract-by-article";
import { chunkMarkdownByHeading } from "../utils/chunk-markdown-by-heading";
import { chunkQaPairs } from "../utils/chunk-qa-pairs";
import { chunkRecursiveByToken } from "../utils/chunk-recursive-by-token";
import { chunkSlideBySlide } from "../utils/chunk-slide-by-slide";
import { chunkTabularData } from "../utils/chunk-tabular-data";
import { splitChunksForRetrieval } from "../utils/split-chunks-for-retrieval";

/**
 * Fetches a document, splits it into retrieval chunks, and generates embeddings.
 * Pure in-memory step — no database writes.
 */
export async function embedChunks(documentId: string): Promise<EmbedChunksResult> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) throw new NotFoundError("document", documentId);

  const strategy = getChunkStrategy(doc.docType);
  const logicalChunks = await dispatchChunker(doc.rawContent, strategy);
  const retrievalChunks = await splitChunksForRetrieval(logicalChunks);

  const vectors =
    retrievalChunks.length > 0
      ? await new OpenAIEmbeddings({ model: EMBEDDING_MODEL }).embedDocuments(
          retrievalChunks.map((c) => c.text),
        )
      : [];

  return {
    retrievalChunks,
    vectors,
    strategy,
    docType: doc.docType,
    createdAt: doc.createdAt,
    publishedAt: doc.publishedAt,
  };
}

async function dispatchChunker(
  content: string,
  strategy: ChunkStrategy,
): Promise<DocumentChunk[]> {
  switch (strategy) {
    case "chunk_contract_by_article":
      return chunkContractByArticle(content, strategy);
    case "chunk_tabular_data":
      return chunkTabularData(content, strategy);
    case "chunk_slide_by_slide":
      return chunkSlideBySlide(content, strategy);
    case "chunk_qa_pairs":
      return chunkQaPairs(content, strategy);
    case "chunk_recursive_by_token":
      return chunkRecursiveByToken(content, strategy);
    case "chunk_markdown_by_heading":
    default:
      return chunkMarkdownByHeading(content, strategy);
  }
}

