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

export const MATCH_TYPE_HINTS: Record<string, string> = {
  direct: "Nội dung nhắc đúng tên hoặc alias của đối tượng.",
  context: "Không nhắc tên; hệ thống nhận ra nhờ ngữ cảnh.",
  manual: "Người dùng thêm mention này bằng tay.",
};

export const MATCH_TIER_LABELS: Record<string, string> = {
  lexical: "Từ khóa",
  llm: "AI",
  user: "Người gán",
};

export const MATCH_TIER_HINTS: Record<string, string> = {
  lexical: "Khớp bằng từ khóa.",
  llm: "Mô hình AI quyết định.",
  user: "Người gán quyết định.",
};

/** Short age for the discussion report, such as "3 giờ" or "2 ngày". */
export function formatRelativeTime(value: string | null) {
  if (!value) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.round(hours / 24)} ngày`;
}

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
