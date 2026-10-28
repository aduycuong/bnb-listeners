import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import type { ChatModelId } from "@/lib/langchain/models/registry";

import { SYNTHETIC_CONFIG } from "../config";
import type { PanelMember } from "../types";

const responseSchema = z.object({
  briefs: z
    .array(
      z.object({
        topic: z.string().describe("The topic of the guide this brief is about, in a few words"),
        brief: z
          .string()
          .describe("One or two sentences in Vietnamese: what happened, as a news line"),
      }),
    )
    .describe("Exactly the requested number of briefs"),
});

const SYSTEM_PROMPT = [
  "Bạn lên kịch bản cho một group Facebook về bất động sản ở Việt Nam: mỗi brief là một chuyện đang xảy ra mà thành viên group sẽ đăng bài và bàn tán.",
  "Mỗi brief 1–2 câu, viết như một dòng tin: ai, làm gì, chuyện gì. Cụ thể nhưng ngắn; không bình luận, không cảm xúc.",
  "Hướng dẫn chủ đề mô tả dự án và những gì người ta hay bàn. Mỗi brief bám một chủ đề trong hướng dẫn; ưu tiên mỗi brief một chủ đề khác nhau.",
  "Gọi đúng tên dự án, chủ đầu tư, vị trí, con số như trong hướng dẫn; không bịa tên dự án khác.",
  "Nếu có brief gần đây: một phần brief nên là diễn biến tiếp theo của chuyện cũ (phản ứng, cập nhật, phản hồi của chủ đầu tư…), phần còn lại là chuyện mới. Không lặp lại nguyên chuyện cũ.",
  "Chi tiết phải hợp lý với thời điểm đã cho và với những người trong group.",
  "Trả về JSON đúng schema.",
].join("\n");

type GenerateBriefsParams = {
  /** Project facts and what people discuss, written by the admin. */
  topicGuide: string;
  count: number;
  /** Newest first; the model continues some of these stories. */
  recentBriefs: string[];
  members: PanelMember[];
  sourceName: string | null;
  /** End of the run window; the briefs happen around then. */
  at: Date;
  model: ChatModelId;
};

/**
 * Asks the model for `count` briefs drawn from the topic guide, continuing recent
 * stories of the source where it fits. Throws when no brief comes back, so
 * the run fails instead of writing threads about nothing.
 */
export async function generateBriefs(params: GenerateBriefsParams): Promise<string[]> {
  const model = createChatModel(params.model, {
    temperature: SYNTHETIC_CONFIG.temperature,
    maxTokens: 300 * params.count,
  });
  const structured = model.withStructuredOutput(responseSchema);
  const user = buildUserPrompt(params);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= SYNTHETIC_CONFIG.briefAttempts; attempt++) {
    try {
      const response = await structured.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(user),
      ]);
      const briefs = response.briefs
        .map((entry) => entry.brief.trim())
        .filter(Boolean)
        .slice(0, params.count);
      if (briefs.length > 0) return briefs;
    } catch (error) {
      lastError = error;
      console.warn("[synthetic-threads] brief call failed", {
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new Error(
    `The model returned no brief${
      lastError instanceof Error ? `: ${lastError.message}` : "."
    }`,
  );
}

function buildUserPrompt(params: GenerateBriefsParams): string {
  const date = params.at.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "short",
  });

  const lines = [
    `Group: ${params.sourceName ?? "group review bất động sản"}`,
    `Thời điểm: ${date}`,
    "",
    "Thành viên tiêu biểu:",
    ...params.members.map((member) => `- ${member.persona.name}: ${member.persona.description}`),
    "",
    "Hướng dẫn chủ đề:",
    params.topicGuide,
    "",
  ];

  if (params.recentBriefs.length > 0) {
    lines.push(
      "Brief gần đây (mới nhất trước):",
      ...params.recentBriefs.map((brief) => `- ${brief}`),
      "",
    );
  }

  lines.push(`Viết ${params.count} brief.`);
  return lines.join("\n");
}
