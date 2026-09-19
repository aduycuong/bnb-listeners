import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import { buildTermLanguageGuideline } from "./term-language-guideline";

const PART_SCORE_GUIDE = `Hai thang điểm độc lập, mỗi thang 0–10:

relevance — mức liên quan tới phạm vi thu thập:
  0  = Hoàn toàn không liên quan hoặc spam
  3  = Chỉ chạm nhẹ, liên quan lỏng lẻo
  5  = Liên quan vừa phải
  7  = Liên quan rõ, đúng chủ đề
  10 = Đúng trọng tâm phạm vi thu thập

detail — mức chi tiết / đầy đủ của thông tin mà PHẦN NÀY tự chứa:
  0  = Không có thông tin (chỉ cảm thán, chào hỏi, emoji, ảnh trang trí)
  3  = Có một vài thông tin rời rạc, thiếu ngữ cảnh để dùng được
  5  = Đủ thông tin cơ bản: ai / cái gì / ở đâu / bao nhiêu
  7  = Chi tiết, có số liệu, mô tả cụ thể, người đọc dùng được ngay
  10 = Rất đầy đủ, nhiều thông tin cụ thể, có thể trả lời nhiều câu hỏi

summary — 1–3 câu tóm tắt đúng thông tin phần này chứa, không suy diễn, không thêm gì ngoài nội dung. Chuỗi rỗng nếu detail ≤ 2.

Chấm hai thang điểm hoàn toàn độc lập: một phần có thể rất liên quan nhưng không chi tiết, hoặc rất chi tiết nhưng ngoài phạm vi.`;

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
  const rules = formatTermRules(settings.termCriteria);

  return `Bạn là bộ phán quyết term (từ khóa/nhãn) cho phạm vi thu thập: ${settings.dataCollectionScope}.

Term trong workspace là từ khóa hoặc nhãn ngắn gọn để gắn và lọc tài liệu — không phải danh mục chủ đề cố định.

Đầu vào: một tài liệu và danh sách term được đề xuất cho chính tài liệu đó (bước trước sinh ra). Mỗi đề xuất đi kèm nhóm term hiện có gần nghĩa nhất trong workspace — đã lọc sơ theo embedding, có thể rỗng.

Nhiệm vụ: với MỖI đề xuất, trả đúng một quyết định:
- existing — tài liệu thực sự nói về một term hiện có trong nhóm của đề xuất đó → trả termId của term đó. Luôn chọn existing khi term hiện có cùng nghĩa với đề xuất, kể cả khi tên khác nhau — không tạo bản sao.
- new — tài liệu thực sự nói về đề xuất này, và KHÔNG term hiện có nào trong nhóm cùng nghĩa. Khác địa danh, khác dự án, hoặc phạm vi rộng/hẹp khác nhau là khác nghĩa. Term mới phải đáng để lọc tài liệu và tuân theo quy tắc tạo term của workspace.
- skip — đề xuất quá hẹp, quá chung, chỉ được nhắc lướt qua, hoặc không đáng là term.

Hướng dẫn:
- termId chỉ được lấy trong nhóm của chính đề xuất đó — không bịa id, không lấy id từ nhóm khác.
- Độ tương đồng đi kèm chỉ là gợi ý lọc sơ; quyết định theo nghĩa và nội dung tài liệu.
- Hai đề xuất có thể cùng trỏ về một term hiện có — trả existing cho cả hai.
- Ưu tiên term cụ thể hơn khi cả term rộng và hẹp đều phù hợp.
- confidence là mức tài liệu thực sự nói về term đó: 0.9+ khi khớp rõ; 0.6–0.8 khi liên quan nhưng không phải trọng tâm; 0 khi skip.
- Trả đúng một quyết định cho mỗi đề xuất, giữ nguyên proposalIndex.${rules}`;
}

export function buildProposeTermPrompt(
  settings: WorkspaceLlmSettings,
): string {
  const languageGuideline = buildTermLanguageGuideline(settings.termLanguage);
  const rules = formatTermRules(settings.termCriteria);

  return `Bạn đề xuất term (từ khóa/nhãn) cho một tài liệu trong phạm vi thu thập: ${settings.dataCollectionScope}.

Term là từ khóa hoặc nhãn ngắn gọn để gắn và lọc tài liệu — không phải danh mục chủ đề cố định. Đề xuất của bạn sẽ được đối chiếu với term hiện có của workspace: đề xuất khớp term cũ sẽ gán vào term đó, đề xuất mới có thể được tạo thành term mới theo quy tắc workspace.

Nhiệm vụ: trả về 0 đến nhiều term (tên ngắn kiểu từ khóa + mô tả một câu) mô tả đúng nội dung tài liệu. Hãy liệt kê ĐẦY ĐỦ mọi từ khóa/nhãn riêng biệt mà tài liệu thực sự nói tới.

Về danh sách term gợi ý (nếu có trong tin nhắn):
- Đó là gợi ý cách đặt tên, KHÔNG phải danh sách đóng và KHÔNG giới hạn số term bạn trả về.
- Nếu tài liệu khớp term nào trong đó, dùng đúng tên term đó — không đặt tên khác cho cùng một ý. Đối chiếu mô tả kèm theo để chắc là cùng phạm vi; nếu khác phạm vi (khác địa danh, khác dự án, rộng/hẹp khác nhau) thì đề xuất term mới.
- Việc dùng term gợi ý KHÔNG thay thế việc đề xuất term mới: nếu tài liệu còn ý nào chưa có trong danh sách gợi ý, vẫn đề xuất term mới cho ý đó. Một lần trả về có thể gồm cả term gợi ý lẫn term mới.

Hướng dẫn:
- Trả về mảng rỗng khi tài liệu ngoài phạm vi thu thập hoặc nội dung quá mơ hồ để gắn nhãn.
- Đề xuất nhiều term khi tài liệu có nhiều từ khóa/nhãn riêng biệt; ưu tiên chính xác hơn gán nhiều, nhưng không bỏ sót ý rõ ràng chỉ vì đã khớp được term gợi ý.
- Không trùng ý trong cùng một lần đề xuất; không đề xuất term quá rộng/chung chung.
- Tên term ngắn, cụ thể, dễ tái sử dụng — ưu tiên dạng từ khóa hơn cụm chủ đề dài.
- Mô tả một câu, tối đa 150 ký tự, nêu phạm vi term để phân biệt với term gần nghĩa.
- ${languageGuideline}${rules}`;
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

export function buildScoreTextPartPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn chấm điểm phần văn bản của một tài liệu thu thập được, theo phạm vi thu thập: ${settings.dataCollectionScope}.

Chỉ những phần đạt cả hai thang điểm đủ cao mới được đưa vào chỉ mục tìm kiếm, nên hãy chấm chặt: nội dung mỏng, kêu gọi tương tác, quảng cáo chung chung hay ngoài phạm vi phải nhận điểm thấp.

${PART_SCORE_GUIDE}`;
}

export function buildScoreMediaPartPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `Bạn chấm điểm MỘT hình ảnh (hoặc video) đính kèm tài liệu thu thập được, theo phạm vi thu thập: ${settings.dataCollectionScope}.

Bạn KHÔNG được cung cấp caption hay nội dung bài viết — hãy chấm hoàn toàn dựa trên những gì nhìn thấy trong ảnh. Một ảnh chỉ đáng đưa vào chỉ mục khi tự nó chứa thông tin có thể truy xuất: infographic, bảng giá, sơ đồ / mặt bằng, ảnh chụp văn bản hoặc thông báo, biểu đồ, bản đồ có chú thích, ảnh sản phẩm có thông tin rõ. Ảnh minh hoạ, ảnh chân dung, phong cảnh, meme, ảnh cần caption mới hiểu được phải nhận detail thấp.

summary chỉ mô tả thông tin đọc được / nhìn thấy trong ảnh (chữ, số liệu, đối tượng, địa điểm nếu có chú thích) — không đoán bối cảnh bài viết.

${PART_SCORE_GUIDE}`;
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
