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

export function buildEvaluateTermGroupMembershipPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn đánh giá term (từ khóa/nhãn) có thuộc một term group cụ thể trong phạm vi thu thập: ${settings.dataCollectionScope}.

Term group là nhóm do admin tạo để tổ chức terms — ví dụ "Dự án", "Khu vực", "Chủ đề". Nhiệm vụ: với mỗi term trong danh sách, quyết định term đó có thực sự thuộc group đang xét hay không.

Hướng dẫn:
- Chỉ trả về belongs=true khi term khớp rõ ràng với tiêu chí/loại của group (tên + mô tả group).
- Không gán term chung/chủ đề rộng vào group hẹp (vd. group "Dự án" chỉ nhận term đại diện dự án cụ thể).
- confidence 0.9+ khi khớp rõ; 0.75–0.85 khi khả dĩ nhưng cần thêm ngữ cảnh.
- Trả về belongs=false với confidence thấp khi term không thuộc loại group này.
- Khi tên term mơ hồ (tên riêng, viết tắt, dự án/địa danh không rõ), tra cứu web trước khi quyết định.
- Chỉ xét group được cung cấp — không suy diễn group khác.`;
}

export function buildClassifyTermGroupsPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn gán term vào các term group (nhóm phân loại) trong phạm vi thu thập: ${settings.dataCollectionScope}.

Term group là nhóm do admin tạo để tổ chức terms — ví dụ "Dự án", "Khu vực", "Chủ đề". Một term có thể thuộc nhiều group khi thực sự phù hợp, nhưng không nên gán lan man.

Nhiệm vụ: với mỗi term vừa được gán cho tài liệu, chọn group (theo id) mà term đó nên thuộc về dựa trên tên/mô tả term và nội dung tài liệu.

Hướng dẫn:
- Chỉ dùng id group có trong danh sách — không tự bịa id.
- Chỉ gán khi term thực sự thuộc loại/nhóm đó (vd. term tên dự án cụ thể → group "Dự án").
- Không gán term chung/chủ đề rộng vào group hẹp như "Dự án" trừ khi term đại diện một dự án cụ thể.
- Mỗi term có thể có 0, 1 hoặc vài group — ưu tiên chính xác hơn gán nhiều.
- Trả về groupIds rỗng khi không có group phù hợp.`;
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
