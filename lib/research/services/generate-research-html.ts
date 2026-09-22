import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { MessageContent } from "@langchain/core/messages";
import { eq } from "drizzle-orm";

import { researchRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";

import {
  getResearchHtmlModel,
  RESEARCH_HTML_MAX_TOKENS,
  RESEARCH_HTML_REASONING_EFFORT,
} from "../config";
import type { DepthLevel, ResearchRunResult } from "../types";
import { formatFindingKindLabel } from "../utils/format-finding-kind-label";
import {
  applyMediaPlaceholders,
  collectParenthesizedUrls,
  createMediaPlaceholderMap,
  finalizeHtmlMedia,
} from "../utils/media-placeholders";

const HTML_SYSTEM_PROMPT = [
  "Bạn là kỹ sư front-end. Hãy chuyển báo cáo nghiên cứu Markdown được cung cấp",
  "thành một tài liệu HTML5 độc lập, chất lượng cao và có tính trình bày.",
  "",
  "Yêu cầu bắt buộc:",
  "- Chỉ xuất tài liệu HTML hoàn chỉnh; không dùng khối mã Markdown, không bình luận.",
  "- Bắt đầu bằng <!DOCTYPE html>; bao gồm <html>, <head> (có <meta charset>",
  "  và viewport responsive) và <body>.",
  "  Giữ nguyên nguyên văn tên riêng, trích dẫn, URL và nội dung nguồn khi cần để bảo toàn tính chính xác.",
  "- Các URL dạng `media://N` là mã thay thế cho URL tệp media. Giữ nguyên văn mã đó",
  "  trong src/href (ví dụ <img src=\"media://3\">); không sửa, không bịa mã, không thay",
  "  bằng URL khác. Hệ thống sẽ thay mã bằng URL thật sau.",
  "- Mọi thứ phải nằm trong tệp: đặt CSS tùy biến trong đúng một thẻ <style>.",
  "- Được phép tải duy nhất các font Google Fonts sau bằng một thẻ <link> trong <head>:",
  "  Be Vietnam Pro (văn bản) và JetBrains Mono (số liệu). Ngoài các font này và",
  "  Apache ECharts CDN, không tải CSS, phông chữ hoặc script bên ngoài.",
  "  Dùng fallback system font đầy đủ nếu font không tải được.",
  "- Apache ECharts CDN được phép dùng cho biểu đồ:",
  '  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>.',
  "- Bảo đảm trang vẫn có thể đọc được khi các font hoặc ECharts CDN không tải được.",
  "",
  "Biên tập nội dung:",
  "- Được phép tổ chức lại cấu trúc, thứ tự và cách trình bày để câu chuyện rõ ràng,",
  "  dễ theo dõi hơn, nhưng phải giữ vững mọi thông tin cốt lõi, kết luận, dữ liệu,",
  "  điều kiện, mức độ không chắc chắn và trích dẫn của báo cáo.",
  "- Dùng HTML ngữ nghĩa với các tiêu đề rõ ràng. Mở đầu bằng phần tóm tắt điều hành",
  "  ngắn gọn, sau đó là các phần hỗ trợ phù hợp.",
  "- Không bắt buộc, cũng không mặc định, bọc mỗi section trong một card. Chỉ dùng card",
  "  khi nó giúp nhóm một mẩu thông tin ngắn; ưu tiên bố cục thoáng, phân cấp kiểu chữ,",
  "  đường phân cách và khoảng trắng tự nhiên.",
  "",
  "Thiết kế và tương tác:",
  "- Hướng thiết kế: chuyên nghiệp, tinh xảo, tối giản như một báo cáo phân tích cao cấp;",
  "  ưu tiên chất lượng biên tập, độ cân bằng, nhịp điệu khoảng trắng và chi tiết tinh tế.",
  "- Dùng Be Vietnam Pro cho toàn bộ văn bản, tiêu đề và chú thích (fallback:",
  '  -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif). Dùng JetBrains Mono',
  "  riêng cho số, phần trăm, tiền tệ, mã, bảng dữ liệu, KPI và nhãn/trục biểu đồ; bật",
  "  font-variant-numeric: tabular-nums để các cột số thẳng hàng.",
  "- Dùng nhất quán bộ màu sau: nền chính #F8FAFC, nền bề mặt #FFFFFF, mực chính #172033,",
  "  mực phụ #526078, viền #DCE3ED, xanh chủ đạo #155EEF, xanh đậm #0B3EA8,",
  "  teal hỗ trợ #087E8B, vàng nhấn #D97706, đỏ cảnh báo #C2410C.",
  "  Dùng màu chủ đạo có tiết chế, giữ độ tương phản chữ đạt mức dễ đọc; không dùng gradient",
  "  sặc sỡ, màu neon hoặc bóng đổ nặng.",
  "- Chiều rộng nội dung hợp lý ở giữa trang. Tạo phân cấp tinh tế bằng cỡ chữ, đậm nhạt,",
  "  đường phân cách 1px, khoảng trắng và các bề mặt nhẹ thay vì lạm dụng khung/card.",
  "- Thiết kế responsive, hỗ trợ bàn phím, trạng thái :focus-visible rõ ràng và tôn trọng",
  "  prefers-reduced-motion.",
  "- Bổ sung tương tác có ích khi phù hợp với nội dung: hiệu ứng hover/focus tinh tế cho",
  "  liên kết và phần tử có thể nhấp; dùng <details>/<summary> cho nội dung phụ, ghi chú",
  "  hoặc nguồn dài; có thể dùng tab/neo điều hướng nếu chúng thực sự làm việc đọc tốt hơn.",
  "  Không thêm tương tác trang trí hoặc làm mất nội dung khi JavaScript không chạy.",
  "- Chuyển nội dung định lượng (bảng term analytics, chỉ số, xu hướng, xếp hạng, so sánh)",
  "  thành biểu đồ ECharts (cột/đường/tròn) khi giúp hiểu dữ liệu. Khởi tạo mỗi biểu đồ trong",
  "  container riêng, responsive khi resize. Luôn giữ bảng dữ liệu gốc để không mất thông tin.",
  "- Giữ mọi ảnh Markdown thành thẻ <img> thật, responsive với max-width: 100%.",
  "- Không bịa số liệu ảnh hoặc dữ liệu biểu đồ; chỉ dùng dữ liệu trong báo cáo.",
  "- Giữ các trích dẫn nội tuyến như [1], [2] và tạo phần Nguồn tham khảo.",
].join("\n");

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

/** Strips a leading/trailing Markdown code fence if the model added one. */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:html)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return (fence ? fence[1] : trimmed).trim();
}

function formatSourcesForPrompt(result: ResearchRunResult): string {
  if (result.sources.length === 0) return "(no sources)";

  return result.sources
    .map((source) => {
      const kind =
        formatFindingKindLabel(source.kind, source.docType) ?? source.kind;
      return `[${source.index}] ${source.title} — ${kind} — ${source.ref}`;
    })
    .join("\n");
}

async function markHtmlFailed(runId: string, message: string): Promise<void> {
  await db
    .update(researchRuns)
    .set({
      htmlStatus: "failed",
      htmlError: message,
      htmlFinishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, runId));
}

/**
 * Renders a succeeded run's Markdown report into a self-contained HTML
 * presentation and stores it on the row. Tracked via the `html_*` columns;
 * the run `status` is never touched. Idempotent for already-succeeded HTML.
 * Called by the QStash `generate-research-html` job handler.
 */
export async function generateResearchHtml(runId: string): Promise<void> {
  const [run] = await db
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.id, runId))
    .limit(1);

  if (!run) {
    console.warn(`[${generateResearchHtml.name}] Run not found: ${runId}`);
    return;
  }

  // HTML only makes sense once the research itself has succeeded.
  if (run.status !== "succeeded" || !run.result) {
    return;
  }

  // Idempotent: don't regenerate an already-produced presentation.
  if (run.htmlStatus === "succeeded" && run.reportHtml) {
    return;
  }

  const model = getResearchHtmlModel(run.depth as DepthLevel);

  await db
    .update(researchRuns)
    .set({
      htmlStatus: "running",
      htmlModel: model,
      htmlError: null,
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, runId));

  try {
    const result = run.result as ResearchRunResult;
    const chat = createChatModel(model, {
      temperature: 0.4,
      maxTokens: RESEARCH_HTML_MAX_TOKENS,
      reasoningEffort: RESEARCH_HTML_REASONING_EFFORT,
    });

    // Same protection as the synthesize step: the model re-emits every image
    // URL into the HTML, and copying ~90-char near-identical R2 URLs is where
    // UUIDs get spliced together (see `media-placeholders.ts`). Hand it short
    // tokens instead and restore them afterwards.
    const mediaMap = createMediaPlaceholderMap(
      collectParenthesizedUrls(result.report),
    );

    const userMessage = [
      `Research goal:\n${run.query}`,
      `\nMarkdown report:\n${applyMediaPlaceholders(result.report, mediaMap)}`,
      `\nNumbered sources:\n${formatSourcesForPrompt(result)}`,
    ].join("\n");

    const response = await chat.invoke([
      new SystemMessage(HTML_SYSTEM_PROMPT),
      new HumanMessage(userMessage),
    ]);

    const rawHtml = stripCodeFence(extractText(response.content));

    if (!rawHtml.toLowerCase().includes("<html")) {
      console.warn(
        `[${generateResearchHtml.name}] Invalid HTML from ${model} (len=${rawHtml.length}): ${rawHtml.slice(0, 200)}`,
      );
      throw new Error(
        rawHtml.length === 0
          ? "Model returned an empty response (token budget may have been consumed by reasoning)."
          : "Model did not return a valid HTML document.",
      );
    }

    const html = finalizeHtmlMedia(rawHtml, mediaMap);

    await db
      .update(researchRuns)
      .set({
        reportHtml: html,
        htmlStatus: "succeeded",
        htmlError: null,
        htmlFinishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "HTML generation failed.";
    await markHtmlFailed(runId, message);
  }
}
