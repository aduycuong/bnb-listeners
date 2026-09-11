import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import { buildTermLanguageGuideline } from "./term-language-guideline";

const DEFAULT_SCORE_RELEVANCE_GUIDE = `Thang điểm:
  0  = Hoàn toàn không liên quan hoặc spam
  3  = Liên quan lỏng lẻo hoặc nội dung mỏng
  5  = Liên quan vừa phải
  7  = Liên quan rõ và hữu ích
  10 = Rất liên quan, có chiều sâu, đúng trọng tâm phạm vi thu thập`;

function formatTermRules(criteria: string): string {
  const lines = criteria
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return `\nQuy tắc tạo term (ưu tiên cao nhất — bắt buộc tuân theo):\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function buildClassifyTermsPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn là bộ gán term (từ khóa/nhãn) cho phạm vi thu thập: ${settings.dataCollectionScope}.

Term trong workspace là từ khóa hoặc nhãn ngắn gọn để gắn và lọc tài liệu — không phải danh mục chủ đề cố định.

Nhiệm vụ: đọc tài liệu và danh sách term hiện có, chọn mọi term (theo id) khớp rõ ràng với nội dung.

Hướng dẫn:
- Chỉ dùng id có trong danh sách — không tự bịa id.
- Gán một hoặc nhiều term khi tài liệu liên quan trực tiếp tới từ khóa/nhãn đó.
- Ưu tiên term cụ thể hơn khi cả term rộng và hẹp đều phù hợp.
- confidence 0.9+ khi khớp rõ; 0.6–0.8 khi liên quan nhưng không phải trọng tâm.
- Trả về mảng assignments rỗng nếu không có term nào trong danh sách phù hợp.`;
}

export function buildProposeTermPrompt(
  settings: WorkspaceLlmSettings,
): string {
  const languageGuideline = buildTermLanguageGuideline(settings.termLanguage);
  const rules = formatTermRules(settings.termCriteria);

  return `Bạn đề xuất term mới (từ khóa/nhãn) cho phạm vi thu thập: ${settings.dataCollectionScope}.

Term mới chủ yếu phải tuân theo quy tắc của workspace. Chỉ đề xuất khi thực sự cần — không bắt buộc phải tạo term cho mọi tài liệu.

Nhiệm vụ: trả về 0 đến nhiều term (tên ngắn kiểu từ khóa + mô tả một câu) phù hợp với tài liệu.

Hướng dẫn:
- Trả về mảng rỗng khi: tài liệu ngoài phạm vi thu thập, nội dung quá mơ hồ, hoặc quy tắc không cho phép tạo term mới.
- Có thể đề xuất nhiều term khi tài liệu có nhiều từ khóa/nhãn riêng biệt, mỗi cái đều đáng tạo theo quy tắc.
- Không trùng tên trong cùng một lần đề xuất; không đề xuất term quá rộng/chung chung.
- Tên term ngắn, cụ thể, dễ tái sử dụng — ưu tiên dạng từ khóa hơn cụm chủ đề dài.
- Mô tả giúp admin quyết định giữ, gộp hay xóa term.
- ${languageGuideline}${rules}
- Nếu chưa có quy tắc bổ sung, vẫn bám phạm vi thu thập và nội dung tài liệu.`;
}

export function buildEvaluateTermPrompt(
  settings: WorkspaceLlmSettings,
  term: { name: string; description: string | null },
): string {
  const description = term.description?.trim()
    ? `\nMô tả term: ${term.description.trim()}`
    : "";

  return `Bạn đánh giá mức độ khớp giữa tài liệu và một term (từ khóa/nhãn) duy nhất trong phạm vi: ${settings.dataCollectionScope}.

Term cần đánh giá:
- Tên: ${term.name.trim()}${description}

Hướng dẫn:
- Trả về match=true chỉ khi tài liệu liên quan trực tiếp tới từ khóa/nhãn này.
- confidence 0.9+ khi khớp rõ; 0.7–0.85 khi khả dĩ nhưng không phải trọng tâm.
- Trả về match=false với confidence thấp khi tài liệu không liên quan hoặc chỉ chạm nhẹ.
- Không xét term khác — chỉ term được cung cấp.`;
}

export function buildScoreRelevancePrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn chấm mức độ liên quan của nội dung với phạm vi thu thập: ${settings.dataCollectionScope}.

Cho điểm từ 0 đến 10 về mức nội dung có giá trị, đúng phạm vi và đáng lập chỉ mục.

${DEFAULT_SCORE_RELEVANCE_GUIDE}`;
}

export function buildScoreCommentStancesPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn phân loại bình luận trên bài đăng mạng xã hội trong phạm vi: ${settings.dataCollectionScope}.

Với mỗi bình luận, trả về:
- role:
  - "debate" — tranh luận ủng hộ/phản bác luận điểm của bài.
  - "answer" — trả lời trực tiếp câu hỏi trong bài.
  - "info" — bổ sung thông tin, kinh nghiệm, link, làm rõ — không chủ yếu tranh luận hay trả lời.
  - "other" — nhiễu, đùa, gật đầu rỗng, lạc đề, hoặc không rõ.
- stance: chỉ khi role là "debate". Dùng "agree", "disagree", hoặc "neutral" so với bài. Các role khác trả về null.
- isSubstantive: true khi bình luận có lập luận, câu trả lời, hoặc thông tin hữu ích đáng truy xuất. false với emoji-only, tag-only, "hóng"/"quan tâm"/"ib"/"+1"/"đúng rồi", hoặc xã giao rỗng. Với role "other" ưu tiên false.

Hướng dẫn:
- Đánh giá role và stance so với bài, không phải cảm xúc tuyệt đối.
- Bình luận ngắn vẫn có thể substantive (vd. "lừa đảo đấy" → debate/disagree; "khoảng 2 triệu" trả lời giá → answer).
- Nếu vừa trả lời vừa tranh luận, chọn ý chính; ưu tiên "debate" khi trọng tâm là đồng ý/không đồng ý.
- Trả về đúng một kết quả cho mỗi bình luận, giữ nguyên số thứ tự đầu vào.`;
}
