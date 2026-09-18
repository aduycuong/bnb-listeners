import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";
import { buildR2VisionImageUrl } from "@/lib/r2/utils/build-r2-image-resize-url";

import { VISION_SCORING_MODEL } from "../config";
import type { PartScores } from "../types";
import {
  partScoreResponseSchema,
  toPartScores,
} from "./part-score-response-schema";

export type ScoreImagePartParams = {
  /** Stable (R2) URL of the image. */
  imageUrl: string;
  systemPrompt: string;
};

/**
 * Scores one image on its own — no caption, no post text. An image is only
 * worth indexing when it carries retrievable information by itself
 * (infographic, price list, floor plan, screenshot of a notice, …); a photo
 * that needs the caption to mean anything must score low on detail.
 */
export async function scoreImagePart(
  params: ScoreImagePartParams,
): Promise<PartScores> {
  const model = createChatModel(VISION_SCORING_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(partScoreResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(params.systemPrompt),
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "Chấm điểm hình ảnh dưới đây. Chỉ dựa trên những gì nhìn thấy trong ảnh.",
        },
        {
          type: "image_url",
          image_url: { url: buildR2VisionImageUrl(params.imageUrl) },
        },
      ],
    }),
  ]);

  return toPartScores(response);
}
