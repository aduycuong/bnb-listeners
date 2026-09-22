import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { MessageContent } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { formatFindings } from "../../utils/format-findings";
import {
  applyMediaPlaceholders,
  collectParenthesizedUrls,
  createMediaPlaceholderMap,
  finalizeMarkdownMedia,
  type MediaPlaceholderMap,
} from "../../utils/media-placeholders";
import type { ResearchGraphContext, ResearchStateType } from "../state";

const SYNTHESIZE_SYSTEM_PROMPT = [
  "Bạn là chuyên gia phân tích nghiên cứu. Viết câu trả lời rõ ràng, giàu hình ảnh,",
  "có cấu trúc tốt bằng Markdown tự do, trực tiếp giải quyết mục tiêu nghiên cứu,",
  "chỉ dựa trên bằng chứng được cung cấp. Bằng chứng nội bộ trong workspace là",
  "nguồn tham chiếu chính: đặt kết luận, khuyến nghị và ví dụ dựa trên đó.",
  "Chỉ dùng bằng chứng web để bổ sung, cung cấp bối cảnh rộng hơn hoặc làm rõ",
  "bằng chứng nội bộ; không để nó lấn át hoặc làm loãng bằng chứng nội bộ liên quan.",
  "Bằng chứng analytics (bảng thống kê thuật ngữ) là cơ sở cho các phát biểu định lượng",
  "— khối lượng, xu hướng, tăng trưởng, xếp hạng theo thời gian; trích dẫn số liệu chính xác,",
  "giữ hoặc rút gọn bảng, và không suy ra con số từ các phát hiện định tính.",
  "Bắt đầu bằng tóm tắt ngắn, sau đó là các phần hỗ trợ.",
  "Ưu tiên trình bày trực quan và có cấu trúc thay vì chỉ văn bản thuần khi bằng chứng",
  "nội bộ hỗ trợ: chỉ giữ ảnh Markdown từ các phát hiện nội bộ trong workspace,",
  "đặt mỗi ảnh gần phát hiện mà nó hỗ trợ. URL ảnh/video trong bằng chứng đã được",
  "thay bằng mã ngắn dạng `media://N`; luôn dùng nguyên mã đó làm URL, ví dụ",
  "`![mô tả alt](media://3)`. Không tự viết URL thật, không sửa hay bịa mã;",
  "hệ thống sẽ thay mã bằng URL thật sau. Khi một phát hiện nội bộ liệt kê",
  "tệp đính kèm ảnh kèm mã, hiển thị bằng cú pháp Markdown `![mô tả alt](media://N)`",
  "thay vì bỏ qua hoặc để dạng văn bản thuần.",
  "Bằng chứng web chỉ là văn bản bổ sung — dùng để mở rộng bối cảnh hoặc làm rõ",
  "phát hiện nội bộ, nhưng không bao giờ đưa ảnh, URL ảnh hay cú pháp ảnh Markdown",
  "từ nguồn web. Giữ các bảng, chỉ số, so sánh và danh sách gạch đầu dòng ngắn gọn",
  "khi chúng giúp bằng chứng dễ đọc hơn. Liên kết",
  "video liên quan thay vì giả vờ nhúng chúng. Trích dẫn bằng chứng nội tuyến",
  "bằng số trong ngoặc vuông như [1], [2] khớp với nguồn đã đánh số.",
  "Không bịa sự thật hay nguồn. Nếu bằng chứng không đủ, hãy nói rõ và nêu",
  "các giả định. Viết bằng ngôn ngữ của mục tiêu nghiên cứu.",
].join(" ");

/** Removes Markdown image syntax so web findings stay text-only for synthesis. */
function stripMarkdownImages(text: string): string {
  return text.replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Builds the `media://N` map from every URL surfaced in internal findings
 * (image chunks and attachment lines). Only internal findings carry media the
 * model is allowed to embed; web images are stripped, not tokenised.
 */
function buildMediaMap(state: ResearchStateType): MediaPlaceholderMap {
  return createMediaPlaceholderMap(
    state.findings
      .filter((finding) => finding.kind === "internal")
      .flatMap((finding) => collectParenthesizedUrls(finding.content)),
  );
}

/**
 * Prepares findings for the prompt: web findings lose their images, internal
 * findings get real media URLs swapped for short tokens. The model must never
 * see a real ~90-char R2 URL — copying them is where UUIDs get spliced
 * together (see `media-placeholders.ts`).
 */
function findingsForSynthesis(
  state: ResearchStateType,
  mediaMap: MediaPlaceholderMap,
) {
  return state.findings.map((finding) => {
    if (finding.kind === "web") {
      return { ...finding, content: stripMarkdownImages(finding.content) };
    }
    if (finding.kind === "internal") {
      return {
        ...finding,
        content: applyMediaPlaceholders(finding.content, mediaMap),
      };
    }
    return finding;
  });
}

function extractText(content: MessageContent): string {
  if (typeof content === "string") return content;

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return "";
    })
    .join("")
    .trim();
}

function buildSynthesizeUserMessage(
  state: ResearchStateType,
  context: string,
): string {
  return [
    `Mục tiêu nghiên cứu:\n${state.query}`,
    state.background ? `\nBối cảnh:\n${state.background}` : "",
    `\nBằng chứng đã đánh số:\n${context || "(không tìm thấy bằng chứng)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createSynthesizeNode(ctx: ResearchGraphContext) {
  return async (
    state: ResearchStateType,
  ): Promise<Partial<ResearchStateType>> => {
    const mediaMap = buildMediaMap(state);
    const { context } = formatFindings(findingsForSynthesis(state, mediaMap));

    if (state.findings.length === 0) {
      return {
        report:
          "Không tìm thấy thông tin liên quan trong cơ sở tri thức workspace hoặc nguồn web cho mục tiêu nghiên cứu này.",
      };
    }

    const model = createChatModel(ctx.synthesizeModel, { temperature: 0.3 });
    const response = await model.invoke([
      new SystemMessage(SYNTHESIZE_SYSTEM_PROMPT),
      new HumanMessage(buildSynthesizeUserMessage(state, context)),
    ]);

    // Swap tokens back to real URLs and drop any image the model pointed at a
    // URL we never issued (a hand-written / spliced URL is always broken).
    return {
      report: finalizeMarkdownMedia(extractText(response.content), mediaMap),
    };
  };
}
