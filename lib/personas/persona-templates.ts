// Template personas and panels for the real-estate (BĐS) community.
// Rough on purpose: good enough to generate data, upgraded later (docs/synthetic-data.md).

export type PersonaTemplate = {
  templateKey: string;
  name: string;
  kind: "individual" | "organization";
  description: string;
  tone: string;
  concerns: string[];
};

export type PersonaPanelTemplate = {
  templateKey: string;
  name: string;
  description: string;
  /** `weight` is relative; it does not need to sum to 100. */
  members: { personaKey: string; weight: number }[];
};

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    templateKey: "flipper-investor",
    name: "Nhà đầu tư lướt sóng",
    kind: "individual",
    description:
      "Mua đi bán lại nhanh theo từng đợt mở bán, quan tâm chênh lệch giá và thanh khoản, ít để ý chất lượng thực tế.",
    tone: "Ngắn gọn, nhiều từ lóng (F0, chênh, cắt lỗ, sóng), tự tin, hay nhắc con số.",
    concerns: ["giá", "thanh khoản", "chênh lệch", "pháp lý"],
  },
  {
    templateKey: "long-term-investor",
    name: "Nhà đầu tư dài hạn",
    kind: "individual",
    description:
      "Mua để giữ và cho thuê, cân nhắc kỹ dòng tiền, pháp lý và uy tín chủ đầu tư trước khi xuống tiền.",
    tone: "Điềm tĩnh, lập luận có số liệu, câu dài, hay so sánh với dự án khác.",
    concerns: ["pháp lý", "dòng tiền", "uy tín chủ đầu tư", "vị trí"],
  },
  {
    templateKey: "first-home-buyer",
    name: "Người mua để ở lần đầu",
    kind: "individual",
    description:
      "Gia đình trẻ cần mua nhà để ở, ngân sách hạn chế, lo vay ngân hàng và rủi ro dự án chậm tiến độ.",
    tone: "Thật thà, hay hỏi, lo lắng, đôi khi viết thiếu dấu hoặc sai chính tả.",
    concerns: ["giá", "vay ngân hàng", "tiến độ", "tiện ích"],
  },
  {
    templateKey: "resident",
    name: "Cư dân đang ở",
    kind: "individual",
    description:
      "Đang sống tại dự án, chia sẻ trải nghiệm hằng ngày về căn hộ, tiện ích và ban quản lý.",
    tone: "Đời thường, kể chuyện cá nhân, cảm xúc vừa phải, hay dùng 'nhà mình', 'bên em'.",
    concerns: ["tiện ích", "phí quản lý", "an ninh", "môi trường sống"],
  },
  {
    templateKey: "unhappy-buyer",
    name: "Khách hàng bức xúc",
    kind: "individual",
    description:
      "Đã mua và gặp vấn đề: bàn giao chậm, sai thiết kế, chưa có sổ. Viết để đòi quyền lợi và kêu gọi người cùng cảnh ngộ.",
    tone: "Gay gắt, viết hoa, nhiều dấu chấm than, kể lể dài, hay tag chủ đầu tư.",
    concerns: ["bàn giao", "sổ hồng", "chất lượng xây dựng", "chủ đầu tư"],
  },
  {
    templateKey: "broker",
    name: "Môi giới / sale",
    kind: "individual",
    description:
      "Môi giới hoặc nhân viên kinh doanh, vào bình luận để chào hàng, kèm thông tin giá và chính sách bán hàng.",
    tone: "Niềm nở, nhiều emoji, kết bằng 'inbox em' hoặc số điện thoại, hơi quảng cáo.",
    concerns: ["giá", "chính sách bán hàng", "vị trí", "tiện ích"],
  },
  {
    templateKey: "reviewer",
    name: "Người review khách quan",
    kind: "individual",
    description:
      "Người đi xem nhiều dự án, viết đánh giá có ưu nhược điểm và so sánh, ít cảm xúc.",
    tone: "Có cấu trúc, liệt kê ưu nhược, ngôn ngữ trung tính, hay kết bằng nhận định.",
    concerns: ["vị trí", "chất lượng xây dựng", "giá", "tiện ích"],
  },
  {
    templateKey: "whistleblower",
    name: "Người hay bóc phốt",
    kind: "individual",
    description:
      "Chuyên chia sẻ thông tin tiêu cực về chủ đầu tư và dự án, đôi khi thiếu kiểm chứng, dễ gây tranh luận.",
    tone: "Giật gân, nghi ngờ, hay đặt câu hỏi tu từ, dẫn nguồn mơ hồ ('nghe nói', 'có người báo').",
    concerns: ["uy tín chủ đầu tư", "pháp lý", "tiến độ", "chất lượng xây dựng"],
  },
  {
    templateKey: "info-seeker",
    name: "Người hỏi thông tin",
    kind: "individual",
    description:
      "Đang tìm hiểu, bình luận ngắn để hỏi giá, pháp lý hoặc vị trí, chưa có ý kiến rõ ràng.",
    tone: "Rất ngắn, câu hỏi cụt ('giá sao ạ?', 'pháp lý ok không?'), thường không dấu.",
    concerns: ["giá", "pháp lý", "vị trí"],
  },
  {
    templateKey: "developer-pr",
    name: "Bộ phận truyền thông chủ đầu tư",
    kind: "organization",
    description:
      "Đại diện chủ đầu tư hoặc đơn vị phân phối, đăng thông tin chính thức và trả lời bình luận theo hướng trấn an.",
    tone: "Trang trọng, lịch sự, dùng 'Quý khách', thông cáo, tránh nhận lỗi trực tiếp.",
    concerns: ["tiến độ", "pháp lý", "chính sách bán hàng", "uy tín chủ đầu tư"],
  },
];

export const PERSONA_PANEL_TEMPLATES: PersonaPanelTemplate[] = [
  {
    templateKey: "real-estate-review-group",
    name: "Group review bất động sản",
    description:
      "Group mở bàn chung về nhiều dự án: người hỏi, môi giới, nhà đầu tư và người review xen lẫn.",
    members: [
      { personaKey: "info-seeker", weight: 25 },
      { personaKey: "broker", weight: 15 },
      { personaKey: "flipper-investor", weight: 15 },
      { personaKey: "first-home-buyer", weight: 15 },
      { personaKey: "reviewer", weight: 12 },
      { personaKey: "whistleblower", weight: 8 },
      { personaKey: "resident", weight: 7 },
      { personaKey: "unhappy-buyer", weight: 3 },
    ],
  },
  {
    templateKey: "project-residents",
    name: "Cư dân dự án",
    description:
      "Cộng đồng của một dự án đã bàn giao: cư dân là chính, kèm khách hàng bức xúc và đại diện chủ đầu tư.",
    members: [
      { personaKey: "resident", weight: 40 },
      { personaKey: "unhappy-buyer", weight: 20 },
      { personaKey: "info-seeker", weight: 12 },
      { personaKey: "first-home-buyer", weight: 10 },
      { personaKey: "broker", weight: 8 },
      { personaKey: "whistleblower", weight: 5 },
      { personaKey: "developer-pr", weight: 5 },
    ],
  },
  {
    templateKey: "investor-community",
    name: "Cộng đồng nhà đầu tư",
    description:
      "Nhóm trao đổi đầu tư bất động sản: lướt sóng, dài hạn, môi giới và người phân tích.",
    members: [
      { personaKey: "flipper-investor", weight: 30 },
      { personaKey: "long-term-investor", weight: 28 },
      { personaKey: "broker", weight: 17 },
      { personaKey: "reviewer", weight: 12 },
      { personaKey: "info-seeker", weight: 8 },
      { personaKey: "whistleblower", weight: 5 },
    ],
  },
];
