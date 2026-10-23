import { safeSlice } from "@/lib/common/safe-slice";

import { MATCH_CONFIG } from "../config";
import type { MatchEntity, MatchItem } from "../types";

const KIND_LABELS: Record<string, string> = {
  post: "bài gốc",
  comment: "bình luận",
  reply: "trả lời",
};

function clip(text: string, max: number) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > max ? `${safeSlice(value, max)}…` : value;
}

/** Tier 2 prompt: is each item about the entity, given the thread's root post? */
export function buildJudgePrompt(params: {
  entity: MatchEntity;
  root: MatchItem;
  items: MatchItem[];
}): { system: string; user: string } {
  const { entity } = params;
  const system = [
    "Bạn phân loại nội dung mạng xã hội về bất động sản bằng tiếng Việt.",
    "Với mỗi mục, cho biết mục đó có đang nói về đối tượng được nêu hay không.",
    "Tính là CÓ khi mục bàn về đối tượng, kể cả khi không gọi tên mà dùng cách nói như \"ở đây\", \"dự án này\", \"chủ đầu tư\", \"vụ này\" trong một bài gốc về đối tượng.",
    "Tính là KHÔNG khi mục là quảng cáo, rao bán không liên quan, lạc đề, nói về đối tượng khác, hoặc trùng tên nhưng mang nghĩa khác.",
    "Một bình luận chỉ được tính là CÓ khi bài gốc cũng nói về đối tượng.",
    "Lý do viết ngắn, dưới 15 từ.",
  ].join("\n");

  const names = [entity.name, ...entity.aliases.filter((alias) => alias !== entity.name)];
  const lines = [
    `Đối tượng: ${entity.name} (${entity.role})`,
    names.length > 1 ? `Tên gọi khác: ${names.slice(1).join(", ")}` : "",
    entity.exclude.length ? `Không tính khi nói về: ${entity.exclude.join(", ")}` : "",
    "",
    `Bài gốc: ${clip(params.root.text, MATCH_CONFIG.maxPostChars) || "(không có chữ)"}`,
    params.root.transcript
      ? `Lời nói trong video của bài gốc (nhận dạng giọng nói tự động, tên riêng có thể bị viết sai theo cách đọc): ${clip(params.root.transcript, MATCH_CONFIG.maxTranscriptChars)}`
      : "",
    "",
    "Các mục cần phân loại:",
    ...params.items.map(
      (item, index) =>
        `[${index}] (${KIND_LABELS[item.kind] ?? item.kind}) ${clip(item.text, MATCH_CONFIG.maxItemChars) || "(không có chữ)"}`,
    ),
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "");

  return { system, user: lines.join("\n") };
}
