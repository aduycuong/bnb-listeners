import { z } from "zod";

/** One new cluster to name: its distinct hints with how many mentions share each. */
export type TopicNamingCluster = { hints: { text: string; count: number }[] };

export const topicNamingSchema = z.object({
  topics: z.array(
    z.object({
      index: z.int().describe("The [n] index of the cluster"),
      name: z.string().describe("Topic name, 2–7 words"),
      description: z.string().describe("One sentence on what the mentions discuss"),
    }),
  ),
});

export type TopicNamingResponse = z.infer<typeof topicNamingSchema>;

/** Prompt that names new topic clusters of a project (D15). */
export function buildTopicNamingPrompt(params: {
  projectName: string;
  clusters: TopicNamingCluster[];
  existingNames: string[];
}): { system: string; user: string } {
  const system = [
    "Bạn đặt tên chủ đề cho các cụm thảo luận mạng xã hội về bất động sản, bằng tiếng Việt có dấu.",
    "Mỗi cụm là danh sách cụm từ tóm tắt các bình luận và bài viết (kèm số lần xuất hiện).",
    "- name: 2–7 chữ, cụ thể như tiêu đề một sự việc hoặc vấn đề (ví dụ \"Chậm bàn giao tòa S2\", \"Phí quản lý tăng\"), không chung chung kiểu \"Thảo luận về dự án\", không chứa thái độ.",
    "- description: một câu nêu người ta đang bàn gì trong cụm.",
    "Tên các cụm phải khác nhau và khác các chủ đề đã có. Trả lời cho mọi cụm được đánh số.",
  ].join("\n");

  const lines = [
    `Project: ${params.projectName}`,
    params.existingNames.length ? `Chủ đề đã có: ${params.existingNames.join("; ")}` : "",
    "Các cụm:",
    ...params.clusters.map(
      (cluster, index) =>
        `[${index}] ${cluster.hints.map((hint) => (hint.count > 1 ? `${hint.text} (${hint.count})` : hint.text)).join("; ")}`,
    ),
  ].filter(Boolean);

  return { system, user: lines.join("\n\n") };
}
