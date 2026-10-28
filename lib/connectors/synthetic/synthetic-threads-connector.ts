import {
  syntheticRecordSchema,
  syntheticThreadsParamsSchema,
  type SyntheticThreadsParams,
} from "@/lib/personas/schema";
import { generateSyntheticRecords } from "@/lib/personas/services/generate-synthetic-records";
import { summarizeSyntheticRun } from "@/lib/personas/services/summarize-synthetic-run";
import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type { DirectConnector, NormalizeResult } from "../types";

/**
 * Writes posts, comments and replies as personas of a panel. Code plans the
 * threads, the LLM writes them (see lib/personas); without a fixed brief it
 * first writes briefs from the run's topic guide. The records go through the
 * normal collect workflow, so the payload is archived and can be normalized
 * again without calling the LLM.
 */
export const syntheticThreadsConnector: DirectConnector<SyntheticThreadsParams> = {
  key: "synthetic-threads",
  platform: "facebook",
  origin: "synthetic",
  mode: "direct",
  paramsSchema: syntheticThreadsParamsSchema,

  async fetchRecords(params, context) {
    if (!context.sourceId) {
      throw new Error("A synthetic-threads run needs a source.");
    }

    return generateSyntheticRecords({
      params,
      collectRunId: context.collectRunId,
      sourceId: context.sourceId,
    });
  },

  normalize(records): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    let skipped = 0;

    for (const record of records) {
      const parsed = syntheticRecordSchema.safeParse(record);
      if (!parsed.success) {
        skipped++;
        continue;
      }

      const data = parsed.data;
      items.push({
        kind: data.kind,
        externalId: data.externalId,
        url: null,
        text: data.text,
        media: [],
        publishedAt: new Date(data.publishedAt),
        likeCount: data.likeCount,
        commentCount: data.commentCount,
        shareCount: data.shareCount,
        viewCount: 0,
        reactions: data.reactions,
        author: {
          externalId: data.author.externalId,
          name: data.author.name,
          url: null,
          followerCount: data.author.followerCount,
          personaId: data.author.personaId,
          metadata: { synthetic: true },
        },
        parentExternalId: data.parentExternalId,
        rootExternalId: data.rootExternalId,
        metadata: { ...data.spec },
      });
    }

    return { items, skipped };
  },

  async afterNormalize(context, params) {
    const summary = await summarizeSyntheticRun(context.collectRunId);

    return {
      stats: {
        threadsPlanned: params.postCount,
        threadsWritten: summary.posts,
        comments: summary.comments,
        replies: summary.replies,
        noiseItems: summary.noiseItems,
        model: params.model,
        seed: params.seed,
        briefs: summary.briefs,
      },
    };
  },
};
