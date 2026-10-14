import type {
  BriefRelevance,
  PersonaSnapshot,
  PlannedItem,
  PlannedThread,
  Sentiment,
  SourceStyleSample,
  TextLength,
} from "../types";

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "tích cực",
  neutral: "trung lập",
  negative: "tiêu cực",
};

const LENGTH_LABELS: Record<TextLength, string> = {
  short: "ngắn (dưới 100 ký tự)",
  medium: "vừa (100–300 ký tự)",
  long: "dài (300–700 ký tự)",
};

const RELEVANCE_LABELS: Record<BriefRelevance, string> = {
  direct: "trực tiếp",
  related: "gián tiếp",
  general: "chung",
};

const KIND_LABELS = {
  post: "BÀI ĐĂNG",
  comment: "BÌNH LUẬN",
  reply: "TRẢ LỜI",
} as const;

export const THREAD_SYSTEM_PROMPT = [
  "Bạn viết bài đăng và bình luận như người dùng thật trong một group Facebook về bất động sản ở Việt Nam.",
  "Mỗi mục được giao một persona, cảm xúc, khía cạnh và độ dài. Viết đúng giọng persona, đời thường, không văn mẫu, không giải thích, không chào hỏi thừa.",
  "Các mục là một cuộc trao đổi thật: bình luận phản hồi bài đăng, trả lời phản hồi bình luận cha của nó. Mỗi người một giọng khác nhau; không lặp ý và không lặp cách mở đầu.",
  "Mỗi mục có mức bám bối cảnh: 'trực tiếp' là phản ứng với sự kiện trong bối cảnh; 'gián tiếp' chỉ nhắc sơ qua hoặc liên quan; 'chung' là không nhắc sự kiện, nói về dự án hay chủ đề theo khía cạnh được giao.",
  "Chỉ nêu sự kiện và thông tin có trong bối cảnh. Tuyệt đối không bịa chi tiết cụ thể về dự án (tiện ích, lãi suất, tỷ lệ vay, số liệu, tên người, pháp lý) nếu bối cảnh không nói; khi cần thì nói chung chung, hỏi lại, hoặc nói theo cảm nhận cá nhân.",
  "Mục có ghi 'chính người đăng bài' phải nhất quán với bài đăng của họ và không tự mâu thuẫn.",
  "Trả về JSON đúng schema: mỗi mục một `text` với đúng `index` đã cho.",
].join("\n");

export type ThreadPrompt = {
  system: string;
  user: string;
  /** Indexes the model must answer, in order. */
  indexes: number[];
};

/**
 * Prompt for one thread. Personas are defined once (P1, P2, …) and items
 * refer to them, which keeps the prompt near the 150-token-per-persona goal.
 * Noise items (spam and the like) are not written by the model.
 */
export function buildThreadPrompt(params: {
  thread: PlannedThread;
  brief: string;
  target?: string;
  samples: SourceStyleSample[];
}): ThreadPrompt {
  const writable = params.thread.items.filter((item) => !item.noise);

  const personaLabels = new Map<string, string>();
  const personas: PersonaSnapshot[] = [];
  for (const item of writable) {
    if (!item.persona || personaLabels.has(item.persona.id)) continue;
    personaLabels.set(item.persona.id, `P${personaLabels.size + 1}`);
    personas.push(item.persona);
  }

  const lines: string[] = [`Bối cảnh: ${params.brief}`];
  if (params.target) {
    lines.push(
      `Đối tượng được bàn: ${params.target}. Bài đăng gọi tên đối tượng (có thể viết tắt hoặc gọi tên khác); comment thường không nhắc lại tên.`,
    );
  }
  lines.push("");

  if (params.samples.length > 0) {
    lines.push(
      "Ví dụ bình luận thật trong group (chỉ để học nhịp điệu và từ ngữ, đừng sao chép):",
      ...params.samples.map((sample) => `- ${sample.text.replace(/\s+/g, " ")}`),
      "",
    );
  }

  lines.push("Persona:");
  for (const persona of personas) {
    const concerns = persona.concerns.length
      ? ` Quan tâm: ${persona.concerns.join(", ")}.`
      : "";
    lines.push(
      `${personaLabels.get(persona.id)} = ${persona.name}. ${persona.description} Giọng: ${persona.tone}${concerns}`,
    );
  }

  lines.push("", "Các mục cần viết:");
  for (const item of writable) {
    lines.push(describeItem(item, personaLabels));
  }

  return {
    system: THREAD_SYSTEM_PROMPT,
    user: lines.join("\n"),
    indexes: writable.map((item) => item.index),
  };
}

function describeItem(
  item: PlannedItem,
  personaLabels: Map<string, string>,
): string {
  const parts = [
    `[${item.index}] ${KIND_LABELS[item.kind]}`,
    item.parentIndex !== null && item.kind === "reply"
      ? `cho [${item.parentIndex}]`
      : null,
    item.persona ? personaLabels.get(item.persona.id) : null,
    `cảm xúc: ${SENTIMENT_LABELS[item.sentiment]}`,
    `mức bám bối cảnh: ${RELEVANCE_LABELS[item.briefRelevance]}`,
    item.aspect ? `khía cạnh: ${item.aspect}` : null,
    `độ dài: ${LENGTH_LABELS[item.length]}`,
    item.byPostAuthor ? "(chính người đăng bài trả lời lại)" : null,
  ];

  return parts.filter(Boolean).join(" · ");
}
