import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { VIDEO_SCORING_MAX_BYTES, VIDEO_SCORING_MODEL } from "../config";
import type { PartScores } from "../types";
import {
  partScoreResponseSchema,
  toPartScores,
} from "./part-score-response-schema";

export type ScoreVideoPartParams = {
  /** Stable (R2) URL of the video. */
  videoUrl: string;
  systemPrompt: string;
};

/**
 * Scores one video on its own — no caption, no post text. Gemini understands
 * video natively (sampled frames + audio track), so we send the whole file and
 * let the model reason over motion and speech, not just a single still.
 *
 * The video is fetched from its stable R2 URL and inlined as base64. Gemini's
 * inline request limit is ~20 MB; anything larger throws here and the caller
 * records the part as `failed` (ineligible). Moving large videos to the Gemini
 * Files API (upload → poll → fileUri) is the planned next step.
 */
export async function scoreVideoPart(
  params: ScoreVideoPartParams,
): Promise<PartScores> {
  const { data, mimeType } = await fetchVideoAsBase64(params.videoUrl);

  const model = createChatModel(VIDEO_SCORING_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(partScoreResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(params.systemPrompt),
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "Chấm điểm video dưới đây. Chỉ dựa trên những gì thấy và nghe trong video.",
        },
        { type: "media", mimeType, data },
      ],
    }),
  ]);

  return toPartScores(response);
}

async function fetchVideoAsBase64(
  videoUrl: string,
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch video (${response.status} ${response.statusText}).`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength > VIDEO_SCORING_MAX_BYTES) {
    throw new Error(
      `Video is ${buffer.byteLength} bytes, over the ${VIDEO_SCORING_MAX_BYTES}-byte inline limit for Gemini.`,
    );
  }

  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";

  return { data: buffer.toString("base64"), mimeType };
}
