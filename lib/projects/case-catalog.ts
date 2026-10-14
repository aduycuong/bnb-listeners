import type { ProjectCase } from "./project-cases";

/** Wizard copy for every real estate case, including the ones not built yet. */
export const PROJECT_CASE_CATALOG: Record<
  ProjectCase,
  { description: string; audience: string }
> = {
  brand: {
    description: "Uy tín, pháp lý, năng lực tài chính của công ty",
    audience: "Lãnh đạo, PR",
  },
  project: {
    description: "Pháp lý, tiến độ, giá rao, câu hỏi người mua",
    audience: "Giám đốc dự án, Sales",
  },
  ir: {
    description: "Trái phiếu, cổ phiếu, tin đồn tài chính",
    audience: "IR, Tài chính",
  },
  launch: {
    description: "Sức nóng sự kiện mở bán, booking",
    audience: "Marketing, Sales",
  },
  broker: {
    description: "Sai giá, chiết khấu sai, cam kết lợi nhuận",
    audience: "Sales, Pháp chế",
  },
  lead: {
    description: "Người đang hỏi mua, hỏi thuê",
    audience: "Sales",
  },
  rival: {
    description: "Giá, chính sách của dự án cạnh tranh",
    audience: "Chiến lược, Sales",
  },
  market: {
    description: "Khu vực nóng, giá, mối lo của người mua",
    audience: "Nghiên cứu, Marketing",
  },
  policy: {
    description: "Luật, bảng giá đất, quy hoạch, hạ tầng",
    audience: "Pháp chế, Phát triển dự án",
  },
  kol: {
    description: "Kênh review dự án có ảnh hưởng",
    audience: "Marketing",
  },
  crisis: {
    description: "Chậm bàn giao, pháp lý, chất lượng công trình",
    audience: "PR, Lãnh đạo",
  },
  residents: {
    description: "Phí quản lý, an ninh, tiện ích, ban quản trị",
    audience: "Quản lý vận hành",
  },
};
