import { z } from "zod";

import type { TopicStageKind } from "../config";

export type TopicMergeCandidate = {
  name: string;
  description: string;
  hints: string[];
};

export const topicMergeSchema = z.object({
  pairs: z.array(
    z.object({
      index: z.int().describe("The [n] index of the pair"),
      same: z.boolean().describe("True when both topics are about the same issue or event"),
    }),
  ),
});

export type TopicMergeResponse = z.infer<typeof topicMergeSchema>;

function describeTopic(topic: TopicMergeCandidate) {
  return `"${topic.name}" (${topic.description}) — ví dụ: ${topic.hints.join("; ")}`;
}

/** Prompt that decides which pairs of close topics are the same topic (D15). */
export function buildTopicMergePrompt(params: {
  pairs: [TopicMergeCandidate, TopicMergeCandidate][];
  kind?: TopicStageKind;
}): { system: string; user: string } {
  const system =
    params.kind === "buyer_question"
      ? [
          "Bạn kiểm tra các cặp nhóm câu hỏi thường gặp có nên gộp làm một không.",
          "same = true khi hai nhóm là cùng một câu hỏi của người mua, chỉ khác cách diễn đạt.",
          "same = false khi chúng hỏi hai điều khác nhau dù cùng khía cạnh (ví dụ \"Khi nào ra sổ?\" và \"Dự án đã có 1/500 chưa?\").",
          "Trả lời cho mọi cặp được đánh số.",
        ].join("\n")
      : [
          "Bạn kiểm tra các cặp chủ đề thảo luận bất động sản có nên gộp làm một không.",
          "same = true khi hai chủ đề nói về cùng một sự việc hoặc vấn đề, chỉ khác cách diễn đạt.",
          "same = false khi chúng là hai vấn đề khác nhau dù liên quan (ví dụ \"Phí quản lý tăng\" và \"Chất lượng dịch vụ quản lý\"), hoặc cùng vấn đề nhưng ở đối tượng khác nhau (hai tòa, hai dự án).",
          "Trả lời cho mọi cặp được đánh số.",
        ].join("\n");

  const user = params.pairs
    .map(([a, b], index) => `[${index}]\nA: ${describeTopic(a)}\nB: ${describeTopic(b)}`)
    .join("\n\n");

  return { system, user };
}
