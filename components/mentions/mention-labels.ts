export const KIND_LABELS: Record<string, string> = {
  post: "Bài",
  comment: "Bình luận",
  reply: "Trả lời",
};

export const MATCH_TYPE_LABELS: Record<string, string> = {
  direct: "Nhắc tên",
  context: "Ngữ cảnh",
  manual: "Thêm tay",
};

export const MATCH_TIER_LABELS: Record<string, string> = {
  lexical: "Từ khóa",
  llm: "AI",
  user: "Người gán",
};

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}
