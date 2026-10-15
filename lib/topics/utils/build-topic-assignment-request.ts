import { z } from "zod";

/** An existing topic offered to the model, under a short key such as `t3`. */
export type TopicAssignmentTopic = {
  key: string;
  name: string;
  description: string;
  hints: string[];
};

/** A hint waiting for a topic, with how many mentions share it. */
export type TopicAssignmentHint = { text: string; count: number };

export const NEW_TOPIC_KEY = "new";

export const topicAssignmentSchema = z.object({
  topics: z.array(
    z.object({
      key: z.string().describe(`Key of an existing topic (t1, t2, …) or "${NEW_TOPIC_KEY}" for a new topic`),
      name: z
        .string()
        .nullable()
        .describe("New topic name: 2–7 words, one issue, no project name; null for an existing topic"),
      description: z
        .string()
        .nullable()
        .describe("New topic: one sentence on what the mentions discuss; null for an existing topic"),
      hints: z.array(z.int()).describe("[n] indexes of the hints that belong to this topic"),
    }),
  ),
});

export type TopicAssignmentResponse = z.infer<typeof topicAssignmentSchema>;

/**
 * Prompt that puts waiting hints into existing or new topics of a project (D15).
 * The project name is left out so the model does not put it in topic names.
 */
export function buildTopicAssignmentPrompt(params: {
  topics: TopicAssignmentTopic[];
  hints: TopicAssignmentHint[];
  minNewTopicMentions: number;
}): { system: string; user: string } {
  const system = [
    "Bạn xếp các cụm từ tóm tắt thảo luận mạng xã hội về bất động sản vào chủ đề (topic) của một project.",
    "Mỗi cụm từ tóm tắt một bình luận hoặc bài viết; số trong ngoặc là số lần xuất hiện.",
    "- Topic là một sự việc hoặc vấn đề cụ thể mà nhiều người cùng bàn, nêu được điều gì đang xảy ra (ví dụ \"Chậm bàn giao tòa S2\", \"Chất lượng xây dựng kém\", \"Giá thứ cấp giảm\", \"Chậm cấp sổ hồng\"), không phải khía cạnh chung chung như \"Giá bán\", \"Vị trí\", \"Pháp lý\", \"Tình trạng pháp lý\", \"Tiện ích dự án\".",
    "- Cụm từ chỉ nêu khía cạnh hoặc hỏi chung (\"pháp lý dự án\", \"giá bán dự án\", \"vị trí dự án\", \"câu hỏi về vay ngân hàng\") và cụm từ ghép nhiều vấn đề (\"giá và pháp lý dự án\") không đủ để tạo topic: bỏ ra ngoài, hoặc xếp vào topic đã có nếu vấn đề chính của nó đúng là topic đó.",
    "- Gom theo vấn đề, không theo tên dự án hay khu: cùng tên khu nhưng khác vấn đề thì khác topic.",
    "- Xếp vào topic đã có chỉ khi cụm từ nói đúng vấn đề của topic, không chỉ cùng khía cạnh (ví dụ \"giá tốt để mua\" hay \"giá bán dự án\" không thuộc \"Giá bán ảo\"). Chỉ trả topic đã có (theo key) khi có cụm từ mới thuộc về nó.",
    `- Tạo topic mới (key "${NEW_TOPIC_KEY}", kèm name và description một câu) khi có ít nhất ${params.minNewTopicMentions} lần xuất hiện cùng một vấn đề cụ thể chưa có topic.`,
    "- Tên topic: 2–7 chữ tiếng Việt có dấu, nêu đúng một vấn đề, khác tên các topic đã có, không chứa thái độ.",
    "- Tên topic không chứa tên dự án hay project, vì mọi topic đều thuộc cùng một project; chỉ ghi tên tòa, khu khi vấn đề chỉ xảy ra ở đó.",
    "- Tên không có chữ \"và\" nối hai vấn đề. Khi cụm từ trộn hai vấn đề, đặt tên theo vấn đề chung của phần lớn cụm từ, hoặc tách thành hai topic.",
    "- Cụm từ chung chung hoặc không thuộc topic nào thì bỏ ra ngoài, đừng ép vào topic; để lại nhiều cụm từ là bình thường. Mỗi cụm từ thuộc tối đa một topic.",
  ].join("\n");

  const lines = [
    params.topics.length
      ? `Topic đã có:\n${describeTopics(params.topics)}`
      : "Chưa có topic nào.",
    `Cụm từ cần xếp:\n${params.hints
      .map((hint, index) => `[${index}] ${hint.text}${hint.count > 1 ? ` (${hint.count})` : ""}`)
      .join("\n")}`,
  ];

  return { system, user: lines.join("\n\n") };
}

export const topicPlacementSchema = z.object({
  items: z.array(
    z.object({
      index: z.int().describe("The [n] index of the hint"),
      key: z.string().nullable().describe("Key of the topic (t1, t2, …) the hint is about; null if none fits exactly"),
    }),
  ),
});

export type TopicPlacementResponse = z.infer<typeof topicPlacementSchema>;

function describeTopics(topics: TopicAssignmentTopic[]) {
  return topics
    .map(
      (topic) =>
        `- ${topic.key}: ${topic.name}${topic.description ? ` — ${topic.description}` : ""}${topic.hints.length ? ` (ví dụ: ${topic.hints.join("; ")})` : ""}`,
    )
    .join("\n");
}

/** Prompt that places each leftover hint into an existing topic or none, one decision per hint (D15). */
export function buildTopicPlacementPrompt(params: {
  projectName: string;
  topics: TopicAssignmentTopic[];
  hints: TopicAssignmentHint[];
}): { system: string; user: string } {
  const system = [
    "Với mỗi cụm từ tóm tắt thảo luận bất động sản, chọn topic mà cụm từ đó nói đúng vấn đề, hoặc null.",
    "- Chỉ chọn khi cụm từ nói đúng vấn đề của topic, không chỉ cùng khía cạnh: \"giá tốt để mua\", \"giá bán dự án\", \"thắc mắc giá hiện tại\" không thuộc \"Giá bán ảo\".",
    "- Cụm từ chung chung, nhiều ý, hoặc không chắc thì null. Phần lớn cụm từ là null là bình thường.",
    "Trả lời cho mọi cụm từ được đánh số.",
  ].join("\n");
  const lines = [
    `Project: ${params.projectName}`,
    `Topic:\n${describeTopics(params.topics)}`,
    `Cụm từ:\n${params.hints.map((hint, index) => `[${index}] ${hint.text}`).join("\n")}`,
  ];
  return { system, user: lines.join("\n\n") };
}
