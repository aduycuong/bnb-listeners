import type { ProjectCase } from "./project-cases";

export const DEMO_PROJECTS: {
  name: string;
  case: ProjectCase;
  description: string;
}[] = [
  {
    name: "Sức khỏe thương hiệu Aqua",
    case: "general",
    description:
      "Theo dõi liên tục sức khỏe thương hiệu Aqua trên mọi kênh, báo cáo hằng tuần cho phòng Marketing.",
  },
  {
    name: "Chiến dịch #SongXanhCungAqua",
    case: "campaign",
    description: "Đổi vỏ chai lấy cây xanh tại 24 điểm ở TP.HCM.",
  },
  {
    name: "Sự cố lô 0925",
    case: "crisis",
    description: "Theo dõi phản ánh hở nắp chai lô 0925 và tiến độ xử lý.",
  },
  {
    name: "Toàn cảnh thị trường Q4",
    case: "competitor",
    description:
      "So sánh Aqua với 3 đối thủ trực tiếp, báo cáo cho ban lãnh đạo.",
  },
  {
    name: "Tiếng nói khách hàng",
    case: "cx",
    description:
      "Gom phản hồi về sản phẩm, giao hàng, ứng dụng và chuyển cho bộ phận phụ trách.",
  },
];
