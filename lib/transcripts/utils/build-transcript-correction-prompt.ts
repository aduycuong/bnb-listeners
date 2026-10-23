import type { TranscriptGlossaryTerm } from "../types";

/**
 * Prompt that lists the misheard names of a transcript. The model only names
 * replacements; the code applies them, so nothing else in the text can change.
 */
export function buildTranscriptCorrectionPrompt(params: {
  transcript: string;
  glossary: TranscriptGlossaryTerm[];
}): { system: string; user: string } {
  const system = [
    "Bạn rà bản ghi lời nói tiếng Việt do máy nhận dạng giọng nói (ASR) tạo ra từ video mạng xã hội về bất động sản.",
    "ASR thường viết sai tên riêng nước ngoài theo cách đọc, ví dụ \"Trellia Vista\" thành \"chelia vita\" hay \"gelia victa\".",
    "Liệt kê các cụm trong bản ghi là một tên trong danh sách bị nghe sai, kèm tên đúng.",
    "Chỉ liệt kê khi cụm đọc giống TOÀN BỘ tên (mọi âm tiết) VÀ ngữ cảnh cho thấy người nói đang nói đúng tên đó.",
    "Không liệt kê khi cụm là một tên khác chỉ giống một phần, ví dụ một phân khu, một khu đô thị hay một dự án khác có tên gần giống; khi không chắc, bỏ qua.",
    "`from` phải chép đúng nguyên văn từ bản ghi (cả hoa thường và dấu). `to` phải là một tên trong danh sách, viết đúng như danh sách.",
    "Mỗi cách viết sai chỉ liệt kê một lần. Không có gì cần sửa thì trả danh sách rỗng.",
  ].join("\n");

  const names = params.glossary.map((term) =>
    term.aliases.length ? `- ${term.name} (cách viết khác: ${term.aliases.join(", ")})` : `- ${term.name}`,
  );

  const user = [`Danh sách tên:\n${names.join("\n")}`, `Bản ghi:\n${params.transcript}`].join("\n\n");

  return { system, user };
}
