import type { ProjectCase } from "./project-cases";

export const CREATE_PROJECT_STEPS = [
  "Kiểu case",
  "Thông tin chung",
  "Dữ liệu",
  "Cấu hình case",
  "Cảnh báo & chia sẻ",
  "Xem lại",
] as const;

export const CREATE_CASE_GROUPS = [
  "Chủ đầu tư",
  "Bán hàng",
  "Thị trường",
  "Sau bán hàng",
] as const;

export type CreateCaseOption = {
  id: string;
  name: string;
  icon: string;
  group: (typeof CREATE_CASE_GROUPS)[number];
  description: string;
  audience: string;
  projectCase: ProjectCase | null;
};

export const CREATE_CASE_OPTIONS: CreateCaseOption[] = [
  {
    id: "brand",
    name: "Uy tín chủ đầu tư",
    icon: "🏢",
    group: "Chủ đầu tư",
    description: "Uy tín, pháp lý, năng lực tài chính của công ty",
    audience: "Lãnh đạo, PR",
    projectCase: "general",
  },
  {
    id: "project",
    name: "Theo dõi dự án",
    icon: "🏙️",
    group: "Chủ đầu tư",
    description: "Pháp lý, tiến độ, giá rao, câu hỏi người mua",
    audience: "Giám đốc dự án, Sales",
    projectCase: "campaign",
  },
  {
    id: "ir",
    name: "Quan hệ nhà đầu tư",
    icon: "📈",
    group: "Chủ đầu tư",
    description: "Trái phiếu, cổ phiếu, tin đồn tài chính",
    audience: "IR, Tài chính",
    projectCase: null,
  },
  {
    id: "launch",
    name: "Mở bán, ra mắt dự án",
    icon: "🚀",
    group: "Bán hàng",
    description: "Sức nóng sự kiện mở bán, booking",
    audience: "Marketing, Sales",
    projectCase: null,
  },
  {
    id: "broker",
    name: "Giám sát sàn phân phối",
    icon: "🛡️",
    group: "Bán hàng",
    description: "Sai giá, chiết khấu sai, cam kết lợi nhuận",
    audience: "Sales, Pháp chế",
    projectCase: "cx",
  },
  {
    id: "lead",
    name: "Tìm khách hàng tiềm năng",
    icon: "🎯",
    group: "Bán hàng",
    description: "Người đang hỏi mua, hỏi thuê",
    audience: "Sales",
    projectCase: null,
  },
  {
    id: "rival",
    name: "Đối thủ cùng khu vực",
    icon: "⚔️",
    group: "Bán hàng",
    description: "Giá, chính sách của dự án cạnh tranh",
    audience: "Chiến lược, Sales",
    projectCase: null,
  },
  {
    id: "market",
    name: "Tâm lý thị trường khu vực",
    icon: "🗺️",
    group: "Thị trường",
    description: "Khu vực nóng, giá, mối lo của người mua",
    audience: "Nghiên cứu, Đầu tư",
    projectCase: "competitor",
  },
  {
    id: "policy",
    name: "Chính sách, quy hoạch, hạ tầng",
    icon: "📜",
    group: "Thị trường",
    description: "Luật, bảng giá đất, quy hoạch, hạ tầng",
    audience: "Pháp chế, Phát triển dự án",
    projectCase: null,
  },
  {
    id: "kol",
    name: "KOL bất động sản",
    icon: "⭐",
    group: "Thị trường",
    description: "Kênh review dự án có ảnh hưởng",
    audience: "Marketing",
    projectCase: null,
  },
  {
    id: "crisis",
    name: "Khủng hoảng",
    icon: "🚨",
    group: "Sau bán hàng",
    description: "Chậm bàn giao, pháp lý, chất lượng công trình",
    audience: "PR, Lãnh đạo",
    projectCase: "crisis",
  },
  {
    id: "residents",
    name: "Cư dân & vận hành",
    icon: "🏠",
    group: "Sau bán hàng",
    description: "Phí quản lý, an ninh, tiện ích, ban quản trị",
    audience: "Quản lý vận hành",
    projectCase: null,
  },
];

export const CREATE_MEMBERS = ["Lan Hương (bạn)", "Quốc Bảo", "Thanh Vy", "Minh Khang"];

export const CREATE_BRANDS = ["Phát Đạt", "La Pura", "Quy Nhơn Iconic", "Bắc Hà Thanh"];

export const CREATE_CHANNELS = [
  "Facebook",
  "Group Facebook",
  "TikTok",
  "YouTube",
  "Báo điện tử",
  "Trang rao vặt",
  "Diễn đàn",
  "Instagram",
  "Threads",
];

export const CREATE_DATASETS = [
  {
    id: "t1",
    name: "Thương hiệu Phát Đạt",
    kind: "Thương hiệu",
    query:
      '("Phát Đạt" OR "PDR" OR "Bất động sản Phát Đạt") NOT ("Hòa Phát" OR "Tiến Phát Đạt")',
    volume: 34260,
  },
  {
    id: "t2",
    name: "Dự án La Pura",
    kind: "Dự án",
    query:
      '("La Pura" OR "Lapura" OR "Astral City" OR "Zenia" OR "Lusso Saigon" OR "Lusso D\'Arte") NOT ("nước hoa La Pura" OR "Pura Vida")',
    volume: 18920,
  },
  {
    id: "t3",
    name: "Dự án Quy Nhơn Iconic",
    kind: "Dự án",
    query: '"Quy Nhơn Iconic"',
    volume: 4180,
  },
  {
    id: "t4",
    name: "Dự án Bắc Hà Thanh",
    kind: "Dự án",
    query: '("Bắc Hà Thanh") AND ("Phát Đạt" OR "dự án" OR "sổ hồng")',
    volume: 2360,
  },
  {
    id: "t5",
    name: "Thị trường căn hộ Đông Bắc TP.HCM",
    kind: "Thị trường",
    query:
      '("căn hộ Thuận An" OR "căn hộ Bình Dương" OR "căn hộ QL13" OR "giá chung cư Dĩ An" OR "lãi suất vay mua nhà") NOT ("tuyển dụng" OR "phòng trọ")',
    volume: 164380,
  },
  {
    id: "t6",
    name: "Chủ đầu tư cùng khu vực",
    kind: "Đối thủ",
    query: '("Becamex IDC" OR "Kim Oanh Group" OR "Bcons")',
    volume: 76400,
  },
  {
    id: "t7",
    name: "Tin rao & quảng cáo của sàn",
    kind: "Nguồn riêng",
    query:
      '("La Pura" OR "Zenia" OR "Lusso Saigon" OR "Lusso D\'Arte") AND ("bán" OR "giá" OR "chiết khấu" OR "suất ngoại giao" OR "căn")',
    volume: 11260,
  },
] as const;

export const ASPECT_OPTIONS = [
  "Pháp lý",
  "Tiến độ",
  "Giá & thanh toán",
  "Vị trí & hạ tầng",
  "Tiện ích",
  "Chất lượng bàn giao",
  "Uy tín chủ đầu tư",
  "Phí quản lý",
];

export type AlertRule = {
  id: string;
  label: string;
  threshold: number;
  unit: string;
  on: boolean;
};

const ALERT_TEMPLATES: Record<string, Omit<AlertRule, "on">[]> = {
  brand: [
    { id: "b1", label: "Tỷ lệ tiêu cực vượt", threshold: 20, unit: "%" },
    { id: "b2", label: "Báo chí nhắc tên kèm từ nhạy cảm, từ", threshold: 1, unit: "bài" },
    { id: "b3", label: "Thảo luận về tài chính, trái phiếu tăng", threshold: 30, unit: "% trong 24 giờ" },
    { id: "b4", label: "Bài lan truyền mạnh", threshold: 500, unit: "lượt chia sẻ" },
  ],
  project: [
    { id: "j1", label: "Tin rao lệch giá tham chiếu quá", threshold: 15, unit: "%" },
    { id: "j2", label: "Tiêu cực về pháp lý, tiến độ vượt", threshold: 30, unit: "%" },
    { id: "j3", label: "Câu hỏi của người mua tăng", threshold: 30, unit: "% trong tuần" },
    { id: "j4", label: "Video review đạt", threshold: 100000, unit: "lượt xem" },
  ],
  market: [
    { id: "m1", label: "Khu vực tăng thảo luận", threshold: 30, unit: "% trong tuần" },
    { id: "m2", label: "Tin chưa kiểm chứng về quy hoạch lan trên", threshold: 10, unit: "group" },
    { id: "m3", label: "Từ khóa cắt lỗ, bán gấp tăng", threshold: 20, unit: "%" },
    { id: "m4", label: "Lo ngại lãi suất vượt", threshold: 30, unit: "%" },
  ],
  broker: [
    { id: "v1", label: "Phát hiện vi phạm mới, từ", threshold: 1, unit: "tin" },
    { id: "v2", label: "Một sàn vượt", threshold: 10, unit: "vi phạm/tháng" },
    { id: "v3", label: "Vi phạm chưa khắc phục sau", threshold: 3, unit: "ngày" },
    { id: "v4", label: "Tin dùng cụm từ cấm, từ", threshold: 1, unit: "tin" },
  ],
  crisis: [
    { id: "k1", label: "Tiêu cực vượt ngưỡng cấp 2", threshold: 50, unit: "bài/giờ" },
    { id: "k2", label: "Tiêu cực vượt ngưỡng cấp 3", threshold: 150, unit: "bài/giờ" },
    { id: "k3", label: "Báo chí đưa tin, từ", threshold: 1, unit: "bài" },
    { id: "k4", label: "Luận điểm mới chiếm trên", threshold: 10, unit: "% thảo luận" },
    { id: "k5", label: "Chưa phản hồi sau", threshold: 4, unit: "giờ" },
  ],
};

export function alertRulesFor(typeId: string): AlertRule[] {
  return (ALERT_TEMPLATES[typeId] ?? []).map((rule) => ({ ...rule, on: true }));
}

export function getCreateCase(typeId: string) {
  return CREATE_CASE_OPTIONS.find((item) => item.id === typeId) ?? null;
}

export function formatMentionCount(value: number) {
  return value.toLocaleString("vi-VN");
}
