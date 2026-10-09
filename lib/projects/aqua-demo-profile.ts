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
  "Group Facebook",
  "TikTok",
  "YouTube",
  "Báo điện tử",
  "Trang rao vặt",
  "Diễn đàn",
];

const LISTING_CHANNELS = ["Facebook", "Group Facebook", "TikTok", "Trang rao vặt"];

const DATASETS = {
  brand: {
    name: "Thương hiệu Phát Đạt",
    query:
      '("Phát Đạt" OR "PDR" OR "Bất động sản Phát Đạt") NOT ("Hòa Phát" OR "Tiến Phát Đạt")',
  },
  lapura: {
    name: "Dự án La Pura",
    query:
      '("La Pura" OR "Lapura" OR "Astral City" OR "Zenia" OR "Lusso Saigon" OR "Lusso D\'Arte") NOT ("nước hoa La Pura" OR "Pura Vida")',
  },
  market: {
    name: "Thị trường căn hộ Đông Bắc TP.HCM",
    query:
      '("căn hộ Thuận An" OR "căn hộ Bình Dương" OR "căn hộ QL13" OR "giá chung cư Dĩ An" OR "lãi suất vay mua nhà") NOT ("tuyển dụng" OR "phòng trọ")',
  },
  peers: {
    name: "Chủ đầu tư cùng khu vực",
    query: '("Becamex IDC" OR "Kim Oanh Group" OR "Bcons")',
  },
  listings: {
    name: "Tin rao & quảng cáo của sàn",
    query:
      '("La Pura" OR "Zenia" OR "Lusso Saigon" OR "Lusso D\'Arte") AND ("bán" OR "giá" OR "chiết khấu" OR "suất ngoại giao" OR "căn")',
  },
} as const;

export const AQUA_ALERT_RULES: Record<AquaCaseId, string[][]> = {
  general: [
    ["Tỷ lệ tiêu cực vượt", "20%", "Email, Zalo"],
    ["Báo chí nhắc tên kèm từ nhạy cảm", "1 bài", "Email, Zalo"],
    ["Thảo luận về tài chính, trái phiếu tăng", "30% trong 24 giờ", "Email, Zalo"],
    ["Bài lan truyền mạnh", "500 lượt chia sẻ", "Email, Zalo"],
  ],
  campaign: [
    ["Tin rao lệch giá tham chiếu quá", "15%", "Email, Zalo"],
    ["Tiêu cực về pháp lý, tiến độ vượt", "30%", "Email, Zalo"],
    ["Câu hỏi của người mua tăng", "30% trong tuần", "Email, Zalo"],
    ["Video review đạt", "100.000 lượt xem", "Email, Zalo"],
  ],
  competitor: [
    ["Khu vực tăng thảo luận", "30% trong tuần", "Email, Zalo"],
    ["Tin chưa kiểm chứng về quy hoạch lan trên", "10 group", "Email, Zalo"],
    ["Từ khóa cắt lỗ, bán gấp tăng", "20%", "Email, Zalo"],
    ["Lo ngại lãi suất vượt", "30%", "Email, Zalo"],
  ],
  cx: [
    ["Phát hiện vi phạm mới, từ", "1 tin", "Email"],
    ["Một sàn vượt", "10 vi phạm/tháng", "Email"],
    ["Vi phạm chưa khắc phục sau", "3 ngày", "Email"],
    ["Tin dùng cụm từ cấm, từ", "1 tin", "Email"],
  ],
  crisis: [
    ["Tiêu cực vượt ngưỡng cấp 2", "40 bài/giờ", "Email, Zalo, SMS"],
    ["Tiêu cực vượt ngưỡng cấp 3", "120 bài/giờ", "Email, Zalo, SMS"],
    ["Báo chí đưa tin, từ", "1 bài", "Email, Zalo, SMS"],
    ["Luận điểm mới chiếm trên", "10% thảo luận", "Email, Zalo, SMS"],
    ["Chưa phản hồi sau", "4 giờ", "Email, Zalo, SMS"],
  ],
};

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
  brand: string;
  owner: string;
  mode: string;
  start: string;
  end?: string;
}): AquaReviewRow[] {
  const rows: AquaReviewRow[] = [
    { label: "Tên dự án", value: text(input.name) },
    { label: "Mô tả", value: text(input.desc) },
    { label: "Thương hiệu, dự án chính", value: text(input.brand) },
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
    { label: "Khu vực", value: text("TP.HCM và vùng lân cận") },
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
    datasets: ["Thương hiệu Phát Đạt", "Chủ đầu tư cùng khu vực"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🏢 Uy tín chủ đầu tư") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Uy tín Phát Đạt (PDR)",
          desc: "Theo dõi uy tín chủ đầu tư và cổ phiếu PDR, báo cáo hằng tháng cho ban lãnh đạo và IR.",
          brand: "Phát Đạt",
          owner: "Lan Hương (bạn)",
          mode: "Liên tục, không có ngày kết thúc",
          start: "01/01/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["brand", "peers"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Uy tín chủ đầu tư",
        rows: [
          {
            label: "Chủ đầu tư dùng để tính Share of Voice",
            value: tags(["Becamex IDC", "Kim Oanh Group", "Bcons"]),
          },
          {
            label: "Trụ cột uy tín",
            value: tags([
              "Pháp lý minh bạch",
              "Tiến độ cam kết",
              "Năng lực tài chính",
              "Chất lượng sản phẩm",
            ]),
          },
          {
            label: "Dự án trọng điểm",
            value: tags(["La Pura", "Quy Nhơn Iconic", "Bắc Hà Thanh"]),
          },
          { label: "Chu kỳ so sánh chỉ số uy tín", value: text("Theo tháng") },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Tỷ lệ tiêu cực vượt: 20%",
            "Báo chí nhắc tên kèm từ nhạy cảm, từ: 1 bài",
            "Thảo luận về tài chính, trái phiếu tăng: 30% trong 24 giờ",
            "Bài lan truyền mạnh: 500 lượt chia sẻ",
          ],
          via: ["Email", "Zalo"],
          to: ["lanhuong@demo-phatdat.vn", "pr@demo-phatdat.vn"],
          digest: "Ngày 1 hằng tháng",
          members: [
            "lanhuong@demo-phatdat.vn · Quản trị",
            "ir@demo-phatdat.vn · Chỉ xem",
          ],
        }),
      },
    ],
  },
  campaign: {
    owner: "Quốc Bảo",
    modeLabel: "Liên tục",
    datasets: ["Dự án La Pura"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🏙️ Theo dõi dự án") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Dự án La Pura",
          desc: "La Pura (tên cũ Astral City), mặt tiền QL13, Thuận An: 8 tháp 40 tầng, gần 5.000 sản phẩm. Phân khu Zenia dự kiến bàn giao 12/2026.",
          brand: "La Pura",
          owner: "Quốc Bảo",
          mode: "Liên tục, không có ngày kết thúc",
          start: "01/04/2025",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["lapura"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Theo dõi dự án",
        rows: [
          { label: "Tên dự án", value: text("La Pura") },
          {
            label: "Tên gọi khác",
            value: tags([
              "Lapura",
              "Astral City",
              "Zenia",
              "Lusso Saigon",
              "Lusso D'Arte",
              "Risa",
            ]),
          },
          { label: "Tỉnh, thành", value: text("TP.HCM") },
          { label: "Khu vực", value: text("Thuận An (cũ)") },
          { label: "Phân khúc", value: text("Căn hộ") },
          { label: "Giai đoạn", value: text("Đang xây dựng") },
          { label: "Giá khởi điểm tham chiếu", value: text("46 tr/m²") },
          { label: "Cảnh báo khi lệch giá", value: text("15%") },
          {
            label: "Khía cạnh theo dõi",
            value: tags([
              "Pháp lý",
              "Tiến độ",
              "Giá & thanh toán",
              "Vị trí & hạ tầng",
              "Tiện ích",
              "Chất lượng bàn giao",
              "Uy tín chủ đầu tư",
              "Phí quản lý",
            ]),
          },
          { label: "Mốc so sánh", value: tags(["TB dự án cùng trục QL13"]) },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Tin rao lệch giá tham chiếu quá: 15%",
            "Tiêu cực về pháp lý, tiến độ vượt: 30%",
            "Câu hỏi của người mua tăng: 30% trong tuần",
            "Video review đạt: 100.000 lượt xem",
          ],
          via: ["Email", "Zalo"],
          to: ["quocbao@demo-phatdat.vn"],
          digest: "Thứ Hai hằng tuần, 8:00",
          members: [
            "quocbao@demo-phatdat.vn · Quản trị",
            "sales@demo-phatdat.vn · Biên tập",
          ],
        }),
      },
    ],
  },
  competitor: {
    owner: "Thanh Vy",
    modeLabel: "01/09/2026 – 31/12/2026",
    datasets: ["Thị trường căn hộ Đông Bắc TP.HCM", "Dự án La Pura"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🗺️ Tâm lý thị trường") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Thị trường căn hộ Đông Bắc TP.HCM",
          desc: "Theo dõi tâm lý thị trường dọc trục QL13 và các khu vực lân cận để định hướng bán hàng La Pura.",
          brand: "Phát Đạt",
          owner: "Thanh Vy",
          mode: "Có thời hạn",
          start: "01/09/2026",
          end: "31/12/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["market", "lapura"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Tâm lý thị trường",
        rows: [
          {
            label: "Khu vực",
            value: tags([
              "Thuận An",
              "Dĩ An",
              "Thủ Dầu Một",
              "Thủ Đức",
              "Biên Hòa",
              "Quận 1",
              "Bình Thạnh",
              "Long Thành",
              "Bình Chánh",
              "Quận 7",
              "Nhơn Trạch",
              "Nhà Bè",
            ]),
          },
          { label: "Phân khúc", value: tags(["Căn hộ"]) },
          {
            label: "Chủ đề theo dõi",
            value: tags([
              "Lãi suất",
              "Metro dọc QL13",
              "Sáp nhập Bình Dương vào TP.HCM",
              "Luật Đất đai 2024",
            ]),
          },
          { label: "Khoảng giá", value: text("2 – 4 tỷ") },
          { label: "Chu kỳ", value: text("Theo tuần") },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Khu vực tăng thảo luận: 30% trong tuần",
            "Tin chưa kiểm chứng về quy hoạch lan trên: 10 group",
            "Từ khóa cắt lỗ, bán gấp tăng: 20%",
            "Lo ngại lãi suất vượt: 30%",
          ],
          via: ["Email", "Zalo"],
          to: ["thanhvy@demo-phatdat.vn"],
          digest: "Thứ Hai hằng tuần, 8:00",
          members: ["thanhvy@demo-phatdat.vn · Quản trị"],
        }),
      },
    ],
  },
  cx: {
    owner: "Minh Khang",
    modeLabel: "Liên tục",
    datasets: ["Tin rao & quảng cáo của sàn", "Dự án La Pura"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🛡️ Giám sát sàn phân phối") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Giám sát sàn – La Pura",
          desc: "Rà soát tin rao, quảng cáo của 34 sàn và môi giới đang phân phối La Pura.",
          brand: "La Pura",
          owner: "Minh Khang",
          mode: "Liên tục, không có ngày kết thúc",
          start: "01/06/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["listings", "lapura"]) },
          ...filterRows({ channels: LISTING_CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Giám sát sàn phân phối",
        rows: [
          { label: "Bảng giá đối chiếu", value: text("Chính sách bán hàng tháng 10/2026") },
          { label: "Chiết khấu tối đa", value: text("9%") },
          { label: "Dung sai giá rao", value: text("5%") },
          { label: "Sàn F1", value: tags(["Đất Việt Land", "An Khang Property"]) },
          {
            label: "Cụm từ cấm",
            value: tags([
              "cam kết cho thuê",
              "cam kết lợi nhuận",
              "suất ngoại giao",
              "giá nội bộ",
              "đại lý độc quyền",
            ]),
          },
          {
            label: "Hạng mục kiểm tra",
            value: tags([
              "Giá rao sai bảng giá",
              "Chiết khấu vượt chính sách",
              "Cam kết lợi nhuận",
              "Thông tin pháp lý sai",
              "Dùng logo trái phép",
              "Tự nhận đại lý chính thức",
            ]),
          },
          { label: "Báo cáo lên khi chưa khắc phục sau", value: text("3 ngày") },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Phát hiện vi phạm mới, từ: 1 tin",
            "Một sàn vượt: 10 vi phạm/tháng",
            "Vi phạm chưa khắc phục sau: 3 ngày",
            "Tin dùng cụm từ cấm, từ: 1 tin",
          ],
          via: ["Email"],
          to: ["phapche@demo-phatdat.vn", "minhkhang@demo-phatdat.vn"],
          digest: "Hằng ngày, 8:00",
          members: [
            "minhkhang@demo-phatdat.vn · Quản trị",
            "phapche@demo-phatdat.vn · Biên tập",
          ],
        }),
      },
    ],
  },
  crisis: {
    owner: "Lan Hương (bạn)",
    modeLabel: "Liên tục",
    datasets: ["Dự án La Pura", "Thương hiệu Phát Đạt"],
    sections: [
      {
        title: "Kiểu case",
        rows: [{ label: "Kiểu case", value: text("🚨 Quản trị khủng hoảng") }],
      },
      {
        title: "Thông tin chung",
        rows: infoRows({
          name: "Mô phỏng: tin đồn lùi bàn giao Zenia",
          desc: "Kịch bản mô phỏng để demo quy trình xử lý khủng hoảng, không phải sự kiện thật.",
          brand: "La Pura",
          owner: "Lan Hương (bạn)",
          mode: "Liên tục, không có ngày kết thúc",
          start: "23/09/2026",
        }),
      },
      {
        title: "Dữ liệu",
        rows: [
          { label: "Bộ dữ liệu", value: datasets(["lapura", "brand"]) },
          ...filterRows({ channels: CHANNELS }),
        ],
      },
      {
        title: "Cấu hình riêng: Quản trị khủng hoảng",
        rows: [
          {
            label: "Tên sự cố",
            value: text("Kịch bản mô phỏng: tin đồn lùi bàn giao tháp Zenia"),
          },
          { label: "Thời điểm phát hiện", value: text("24/09/2026 06:00") },
          { label: "Mức độ ban đầu", value: text("Cấp 2 – Lan rộng") },
          {
            label: "Từ khóa nhận diện sự cố",
            value: tags(["lùi bàn giao", "Zenia 2027", "chậm tiến độ", "La Pura chậm"]),
          },
          { label: "Lên cấp 2 khi tiêu cực vượt (bài/giờ)", value: text("40") },
          { label: "Lên cấp 3 khi tiêu cực vượt (bài/giờ)", value: text("120") },
          { label: "Thời gian phản hồi tối đa (giờ)", value: text("4") },
          { label: "Tần suất cập nhật dữ liệu", value: text("5 phút") },
          {
            label: "Đội xử lý (email)",
            value: tags(["pr@demo-phatdat.vn", "cskh@demo-phatdat.vn"]),
          },
        ],
      },
      {
        title: "Cảnh báo & chia sẻ",
        rows: shareRows({
          rules: [
            "Tiêu cực vượt ngưỡng cấp 2: 40 bài/giờ",
            "Tiêu cực vượt ngưỡng cấp 3: 120 bài/giờ",
            "Báo chí đưa tin, từ: 1 bài",
            "Luận điểm mới chiếm trên: 10% thảo luận",
            "Chưa phản hồi sau: 4 giờ",
          ],
          via: ["Email", "Zalo", "SMS"],
          to: ["pr@demo-phatdat.vn", "lanhuong@demo-phatdat.vn"],
          digest: "Hằng ngày, 8:00",
          members: [
            "lanhuong@demo-phatdat.vn · Quản trị",
            "pr@demo-phatdat.vn · Biên tập",
          ],
        }),
      },
    ],
  },
};

export function getAquaProfile(caseId: AquaCaseId) {
  return AQUA_PROFILES[caseId];
}
