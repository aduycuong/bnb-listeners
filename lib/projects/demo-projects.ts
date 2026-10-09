import type { ProjectCase } from "./project-cases";

export const DEMO_PROJECTS: {
  name: string;
  legacyNames: string[];
  case: ProjectCase;
  description: string;
}[] = [
  {
    name: "Uy tín Phát Đạt (PDR)",
    legacyNames: ["Sức khỏe thương hiệu Aqua"],
    case: "general",
    description:
      "Theo dõi uy tín chủ đầu tư và cổ phiếu PDR, báo cáo hằng tháng cho ban lãnh đạo và IR.",
  },
  {
    name: "Dự án La Pura",
    legacyNames: ["Chiến dịch #SongXanhCungAqua"],
    case: "campaign",
    description:
      "La Pura (tên cũ Astral City), mặt tiền QL13, Thuận An: 8 tháp 40 tầng, gần 5.000 sản phẩm. Phân khu Zenia dự kiến bàn giao 12/2026.",
  },
  {
    name: "Thị trường căn hộ Đông Bắc TP.HCM",
    legacyNames: ["Toàn cảnh thị trường Q4"],
    case: "competitor",
    description:
      "Theo dõi tâm lý thị trường dọc trục QL13 và các khu vực lân cận để định hướng bán hàng La Pura.",
  },
  {
    name: "Giám sát sàn – La Pura",
    legacyNames: ["Tiếng nói khách hàng"],
    case: "cx",
    description:
      "Rà soát tin rao, quảng cáo của 34 sàn và môi giới đang phân phối La Pura.",
  },
  {
    name: "Mô phỏng: tin đồn lùi bàn giao Zenia",
    legacyNames: ["Sự cố lô 0925"],
    case: "crisis",
    description:
      "Kịch bản mô phỏng để demo quy trình xử lý khủng hoảng, không phải sự kiện thật.",
  },
];
