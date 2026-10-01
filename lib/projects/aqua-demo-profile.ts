import type { AquaCaseId } from "./aqua-demo";

export type AquaTag = { text: string; excluded?: boolean };

export type AquaReviewValue =
  | { type: "text"; text: string }
  | { type: "tags"; tags: AquaTag[] }
  | { type: "lines"; lines: string[] }
  | { type: "datasets"; items: { name: string; query: string }[] };

export type AquaReviewRow = {
  label: string;
  value: AquaReviewValue;
};

export type AquaReviewSection = {
  title: string;
  rows: AquaReviewRow[];
};

export type AquaProjectProfile = {
  owner: string;
  modeLabel: string;
  datasets: string[];
  sections: AquaReviewSection[];
};

const CHANNELS = [
  "Facebook",
  "TikTok",
  "YouTube",
  "Báo điện tử",
  "Diễn đàn",
  "Instagram",
  "Sàn TMĐT",
];

const ALL_CHANNELS = [...CHANNELS, "App Store", "Google Play", "Google Maps"];

const DATASETS = {
  t1: {
    name: "Thương hiệu Aqua",
    query:
      '("Aqua" OR "nước Aqua" OR "AquaVN") AND ("nước suối" OR "nước đóng chai" OR "chai" OR "thùng") NOT ("Aquaman" OR "Aquarium" OR "Aqua City")',
  },
  t2: {
    name: "Đối thủ trực tiếp",
    query:
      '("Breeze" OR "Nami" OR "Coolo") AND ("nước suối" OR "nước đóng chai" OR "nước khoáng") NOT ("Nami (One Piece)" OR "gió breeze")',
  },
  t3: {
    name: "Ngành nước giải khát",
    query:
      '("nước suối" OR "nước khoáng" OR "nước đóng chai" OR "nước điện giải") NOT ("quảng cáo" OR "tuyển dụng")',
  },
  t4: {
    name: "Đánh giá sàn TMĐT & ứng dụng",
    query: '("Aqua" OR "app Aqua")',
  },
} as const;

function tags(values: string[], excluded = false): AquaReviewValue {
  return {
    type: "tags",
    tags: values.map((text) => ({ text, excluded })),
  };
}

function text(value: string): AquaReviewValue {
  return { type: "text", text: value };
}

function lines(values: string[]): AquaReviewValue {
  return { type: "lines", lines: values };
}

function datasets(ids: (keyof typeof DATASETS)[]): AquaReviewValue {
  return {
    type: "datasets",
    items: ids.map((id) => DATASETS[id]),
  };
}

function infoRows(input: {
  name: string;
  desc: string;
  owner: string;
  mode: string;
  start: string;
  end?: string;
}): AquaReviewRow[] {
  const rows: AquaReviewRow[] = [
    { label: "Tên dự án", value: text(input.name) },
    { label: "Mô tả", value: text(input.desc) },
    { label: "Thương hiệu chính", value: text("Aqua") },
    { label: "Người phụ trách", value: text(input.owner) },
    { label: "Thời gian", value: text(input.mode) },
    { label: "Từ ngày", value: text(input.start) },
  ];

  if (input.end) {
    rows.push({ label: "Đến ngày", value: text(input.end) });
  }

  return rows;
}

function filterRows(input: {
  include?: string[];
  channels: string[];
}): AquaReviewRow[] {
  return [
    {
      label: "Chỉ lấy bài có chứa",
      value: input.include?.length ? tags(input.include) : text(""),
    },
    { label: "Loại trừ thêm", value: text("") },
    { label: "Kênh", value: tags(input.channels) },
    { label: "Ngôn ngữ", value: tags(["Tiếng Việt"]) },
    { label: "Khu vực", value: text("Toàn quốc") },
  ];
}

function shareRows(input: {
  rules: string[];
  via: string[];
  to: string[];
  digest: string;
  members: string[];
}): AquaReviewRow[] {
  return [
    { label: "Quy tắc cảnh báo", value: lines(input.rules) },
    { label: "Gửi cảnh báo qua", value: tags(input.via) },
    { label: "Người nhận cảnh báo", value: tags(input.to) },
    { label: "Báo cáo AI định kỳ", value: text(input.digest) },
    { label: "Thành viên và vai trò", value: lines(input.members) },
  ];
}

export const AQUA_PROFILES: Record<AquaCaseId, AquaProjectProfile> = {
  general: {
    owner: "Lan Hương (bạn)",
    modeLabel: "Liên tục",
    datasets: ["Thương hiệu Aqua", "Đối thủ trực tiếp"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🧭 Sức khỏe thương hiệu") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Sức khỏe thương hiệu Aqua",
          desc: "Theo dõi liên tục sức khỏe thương hiệu Aqua trên mọi kênh, báo cáo hằng tuần cho phòng Marketing.",
          owner: "Lan Hương (bạn)",
          mode: "Liên tục, không có ngày kết thúc",
          start: "01/01/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["t1", "t2"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Sức khỏe thương hiệu",
        rows: [
          {
            label: "Thương hiệu dùng để tính Share of Voice",
            value: tags(["Breeze", "Nami", "Coolo"]),
          },
          {
            label: "Thuộc tính thương hiệu cần đo",
            value: tags([
              "Tươi mát",
              "Giá hợp lý",
              "Tiện lợi",
              "Chất lượng ổn định",
              "Thân thiện môi trường",
            ]),
          },
          { label: "Chu kỳ so sánh chỉ số sức khỏe", value: text("Theo tháng") },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Đề cập tăng đột biến: 50% trong 1 giờ",
            "Tỷ lệ tiêu cực vượt: 25%",
            "Bài lan truyền mạnh: 500 lượt chia sẻ",
            "Báo chí nhắc tên, từ: 1 bài",
          ],
          via: ["Email", "Zalo"],
          to: ["lanhuong@aqua.vn", "marketing@aqua.vn"],
          digest: "Thứ Hai hằng tuần, 8:00",
          members: [
            "lanhuong@aqua.vn · Quản trị",
            "minhtuan@aqua.vn · Chỉ xem",
          ],
        }),
      },
    ],
  },
  campaign: {
    owner: "Thu Trang",
    modeLabel: "18/09/2026 – 10/10/2026",
    datasets: ["Thương hiệu Aqua"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🚀 Đo lường chiến dịch") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Chiến dịch #SongXanhCungAqua",
          desc: "Đổi vỏ chai lấy cây xanh tại 24 điểm ở TP.HCM.",
          owner: "Thu Trang",
          mode: "Có thời hạn",
          start: "18/09/2026",
          end: "10/10/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["t1"]) },
          ...filterRows({
            include: ["#SongXanhCungAqua", "đổi vỏ chai", "Sống Xanh Cùng Aqua"],
            channels: CHANNELS,
          }),
        ],
      },
      {
        title: "Cấu hình riêng: Đo lường chiến dịch",
        rows: [
          { label: "Hashtag chiến dịch", value: tags(["#SongXanhCungAqua"]) },
          {
            label: "Từ khóa chiến dịch",
            value: tags(["đổi vỏ chai", "Sống Xanh Cùng Aqua"]),
          },
          {
            label: "KOL tham gia",
            value: tags(["Linh Trần", "Duy Anh Vlog", "Thùy Dương", "Hà Phương"]),
          },
          {
            label: "Các giai đoạn chiến dịch",
            value: lines([
              "Teaser · 18/09/2026 · 21/09/2026",
              "Kích hoạt · 22/09/2026 · 26/09/2026",
              "Lan tỏa · 27/09/2026 · 10/10/2026",
            ]),
          },
          { label: "Lượt đề cập", value: text("25.000") },
          { label: "Nội dung UGC", value: text("5.000") },
          { label: "Tiếp cận (người)", value: text("10.000.000") },
          { label: "Tương tác", value: text("1.000.000") },
          { label: "NSS tối thiểu", value: text("60") },
          { label: "Ngân sách (VNĐ)", value: text("395.000.000") },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Tiến độ KPI thấp hơn kế hoạch: 70% kế hoạch",
            "Phàn nàn về chiến dịch vượt: 20 bài/ngày",
            "Bài KOL đạt: 100.000 lượt xem",
            "Hashtag tăng: 200% trong 24 giờ",
          ],
          via: ["Email", "Zalo"],
          to: ["thutrang@aqua.vn"],
          digest: "Hằng ngày, 8:00",
          members: [
            "thutrang@aqua.vn · Quản trị",
            "agency@greenmedia.vn · Biên tập",
          ],
        }),
      },
    ],
  },
  crisis: {
    owner: "Đức Anh",
    modeLabel: "Liên tục",
    datasets: ["Thương hiệu Aqua"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🚨 Quản trị khủng hoảng") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Sự cố lô 0925",
          desc: "Theo dõi phản ánh hở nắp chai lô 0925 và tiến độ xử lý.",
          owner: "Đức Anh",
          mode: "Liên tục, không có ngày kết thúc",
          start: "29/09/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["t1"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Quản trị khủng hoảng",
        rows: [
          { label: "Tên sự cố", value: text("Nghi vấn hở nắp chai lô 0925") },
          { label: "Thời điểm phát hiện", value: text("30/09/2026 06:10") },
          { label: "Mức độ ban đầu", value: text("Cấp 2 – Lan rộng") },
          {
            label: "Từ khóa nhận diện sự cố",
            value: tags(["hở nắp", "rò rỉ", "lô 0925", "thu hồi"]),
          },
          { label: "Lên cấp 2 khi tiêu cực vượt (bài/giờ)", value: text("50") },
          { label: "Lên cấp 3 khi tiêu cực vượt (bài/giờ)", value: text("150") },
          { label: "Thời gian phản hồi tối đa (giờ)", value: text("4") },
          { label: "Tần suất cập nhật dữ liệu", value: text("5 phút") },
          {
            label: "Đội xử lý (email)",
            value: tags(["pr@aqua.vn", "cskh@aqua.vn"]),
          },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Tiêu cực vượt ngưỡng cấp 2: 50 bài/giờ",
            "Tiêu cực vượt ngưỡng cấp 3: 150 bài/giờ",
            "Báo chí đưa tin, từ: 1 bài",
            "Luận điểm mới chiếm trên: 10% thảo luận",
            "Chưa phản hồi sau: 4 giờ",
          ],
          via: ["Email", "Zalo", "SMS"],
          to: ["pr@aqua.vn", "ducanh@aqua.vn"],
          digest: "Hằng ngày, 8:00",
          members: [
            "ducanh@aqua.vn · Quản trị",
            "pr@aqua.vn · Biên tập",
            "ceo@aqua.vn · Chỉ xem",
          ],
        }),
      },
    ],
  },
  competitor: {
    owner: "Minh Tuấn",
    modeLabel: "01/10/2026 – 31/12/2026",
    datasets: ["Thương hiệu Aqua", "Đối thủ trực tiếp", "Ngành nước giải khát"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("⚔️ So sánh đối thủ") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Toàn cảnh thị trường Q4",
          desc: "So sánh Aqua với 3 đối thủ trực tiếp, báo cáo cho ban lãnh đạo.",
          owner: "Minh Tuấn",
          mode: "Có thời hạn",
          start: "01/10/2026",
          end: "31/12/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["t1", "t2", "t3"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: So sánh đối thủ",
        rows: [
          { label: "Thương hiệu của bạn", value: text("Aqua") },
          { label: "Đối thủ (tối đa 5)", value: tags(["Breeze", "Nami", "Coolo"]) },
          {
            label: "Thuộc tính so sánh",
            value: tags([
              "Giá",
              "Chất lượng",
              "Bao bì",
              "Khuyến mãi",
              "Phân phối",
              "Môi trường",
            ]),
          },
          {
            label: "Chỉ số hiển thị",
            value: tags(["SOV", "NSS", "Tương tác"]),
          },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Đối thủ tăng đề cập: 30% trong 24 giờ",
            "SOV của bạn giảm: 3 điểm/tuần",
            "Đối thủ nhắc “khuyến mãi”, “ra mắt”: 20 bài/ngày",
          ],
          via: ["Email", "Zalo"],
          to: ["minhtuan@aqua.vn"],
          digest: "Ngày 1 hằng tháng",
          members: ["minhtuan@aqua.vn · Quản trị"],
        }),
      },
    ],
  },
  cx: {
    owner: "Thu Trang",
    modeLabel: "Liên tục",
    datasets: ["Thương hiệu Aqua", "Đánh giá sàn TMĐT & ứng dụng"],
    sections: [
      {
        title: "Kiểu case",
        rows: [
          { label: "Kiểu case", value: text("🛠️ Phản hồi khách hàng (CX)") },
        ],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Tiếng nói khách hàng",
          desc: "Gom phản hồi về sản phẩm, giao hàng, ứng dụng và chuyển cho bộ phận phụ trách.",
          owner: "Thu Trang",
          mode: "Liên tục, không có ngày kết thúc",
          start: "01/06/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["t1", "t4"]) },
          ...filterRows({ channels: ALL_CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Phản hồi khách hàng (CX)",
        rows: [
          {
            label: "Các khâu trong hành trình khách hàng",
            value: tags(["Tìm hiểu", "Mua hàng", "Giao hàng", "Sử dụng", "Hậu mãi"]),
          },
          {
            label: "Khía cạnh cần đo cảm xúc",
            value: tags([
              "Giá",
              "Chất lượng",
              "Bao bì",
              "Giao hàng",
              "CSKH",
              "Ứng dụng",
            ]),
          },
          { label: "Nguồn đánh giá bổ sung", value: tags(["Sàn TMĐT"]) },
          {
            label: "Vấn đề → bộ phận phụ trách",
            value: lines([
              "Giao hàng · Vận hành",
              "Ứng dụng · Kỹ thuật",
              "CSKH · CSKH",
            ]),
          },
          { label: "Thời gian xử lý tối đa (giờ)", value: text("24") },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Vấn đề mới xuất hiện, từ: 20 bài/ngày",
            "Tiêu cực theo khía cạnh tăng: 30%",
            "Vấn đề chưa xử lý sau: 24 giờ",
            "Đề xuất sản phẩm đạt: 50 lượt",
          ],
          via: ["Email", "Zalo"],
          to: ["cskh@aqua.vn"],
          digest: "Hằng ngày, 8:00",
          members: [
            "cskh@aqua.vn · Biên tập",
            "thutrang@aqua.vn · Quản trị",
          ],
        }),
      },
    ],
  },
};

export function getAquaProfile(caseId: AquaCaseId) {
  return AQUA_PROFILES[caseId];
}
