import { z } from "zod";

import type { AvailableProjectCase } from "./project-cases";

export const ENTITY_ROLES = [
  "primary",
  "competitor",
  "product",
  "person",
  "area",
] as const;

export type EntityRole = (typeof ENTITY_ROLES)[number];

export type CaseEntityRole = {
  role: EntityRole;
  label: string;
  hint: string;
  placeholder: string;
  aliasPlaceholder: string;
  min: number;
  max: number;
};

export type CaseAspectTemplate = {
  key: string;
  name: string;
  description: string;
};

export const PROPERTY_SEGMENTS = [
  "Căn hộ",
  "Nhà phố",
  "Biệt thự",
  "Đất nền",
  "Condotel",
  "Văn phòng",
] as const;

export const PROJECT_STAGES = [
  "Sắp mở bán",
  "Đang mở bán",
  "Đang xây dựng",
  "Đã bàn giao",
] as const;

export const REPORT_PERIODS = ["week", "month", "quarter"] as const;

export const REPORT_PERIOD_LABELS: Record<(typeof REPORT_PERIODS)[number], string> = {
  week: "Theo tuần",
  month: "Theo tháng",
  quarter: "Theo quý",
};

const optionalText = z.string().trim().max(120).optional();
const optionalPositive = z.number().positive().optional();

export const projectCaseConfigSchema = z.object({
  province: optionalText,
  district: optionalText,
  segment: z.enum(PROPERTY_SEGMENTS).optional(),
  stage: z.enum(PROJECT_STAGES).optional(),
  /** Developer's reference price, million VND per m². */
  priceRef: optionalPositive,
});

export const marketCaseConfigSchema = z
  .object({
    segments: z
      .array(z.enum(PROPERTY_SEGMENTS))
      .min(1, { error: "Chọn ít nhất một phân khúc." }),
    /** Price band buyers talk about, billion VND. */
    priceMin: optionalPositive,
    priceMax: optionalPositive,
    period: z.enum(["week", "month"]).default("week"),
  })
  .refine(
    (value) =>
      value.priceMin === undefined ||
      value.priceMax === undefined ||
      value.priceMin <= value.priceMax,
    { error: "Giá từ phải nhỏ hơn hoặc bằng giá đến.", path: ["priceMax"] },
  );

export const brandCaseConfigSchema = z.object({
  period: z.enum(REPORT_PERIODS).default("month"),
});

export type CaseTemplate = {
  roles: CaseEntityRole[];
  aspects: CaseAspectTemplate[];
  configSchema: z.ZodType<Record<string, unknown>>;
  defaultConfig: Record<string, unknown>;
};

/** Entity, aspect and config templates for the cases built in phase 3 (D10). */
export const CASE_TEMPLATES: Record<AvailableProjectCase, CaseTemplate> = {
  project: {
    roles: [
      {
        role: "primary",
        label: "Dự án theo dõi",
        hint: "Tên thương mại; alias gồm tên phân khu, tên cũ, cách viết tắt",
        placeholder: "VD: La Pura",
        aliasPlaceholder: "VD: Zenia, Astral City",
        min: 1,
        max: 1,
      },
      {
        role: "competitor",
        label: "Dự án cạnh tranh",
        hint: "Dùng để so sánh mức độ được nhắc tới và cảm xúc",
        placeholder: "VD: dự án cùng trục QL13",
        aliasPlaceholder: "Tên khác",
        min: 0,
        max: 10,
      },
    ],
    aspects: [
      { key: "legal", name: "Pháp lý", description: "Sổ hồng, giấy phép, quy hoạch 1/500, tranh chấp" },
      { key: "progress", name: "Tiến độ", description: "Tiến độ xây dựng, bàn giao, chậm trễ" },
      { key: "price", name: "Giá & thanh toán", description: "Giá bán, giá rao lại, chiết khấu, lịch thanh toán, vay" },
      { key: "location", name: "Vị trí & hạ tầng", description: "Kết nối giao thông, hạ tầng xung quanh, ngập, kẹt xe" },
      { key: "amenities", name: "Tiện ích", description: "Tiện ích nội khu và ngoại khu" },
      { key: "quality", name: "Chất lượng bàn giao", description: "Chất lượng xây dựng, vật liệu, lỗi khi nhận nhà" },
      { key: "developer", name: "Uy tín chủ đầu tư", description: "Năng lực, lịch sử, cam kết của chủ đầu tư" },
      { key: "management_fee", name: "Phí quản lý", description: "Phí quản lý, phí dịch vụ, vận hành" },
    ],
    configSchema: projectCaseConfigSchema,
    defaultConfig: { segment: "Căn hộ", stage: "Đang mở bán" },
  },
  market: {
    roles: [
      {
        role: "area",
        label: "Khu vực theo dõi",
        hint: "Alias gồm tên trước sáp nhập, cách viết tắt, tên tuyến đường quen gọi",
        placeholder: "VD: Thuận An",
        aliasPlaceholder: "VD: Lái Thiêu, TA",
        min: 1,
        max: 30,
      },
    ],
    aspects: [
      { key: "price", name: "Giá", description: "Mặt bằng giá, tăng giảm giá, giá rao" },
      { key: "liquidity", name: "Thanh khoản", description: "Mua bán, cắt lỗ, bán gấp, khó bán" },
      { key: "infrastructure", name: "Hạ tầng & quy hoạch", description: "Đường, metro, quy hoạch, sáp nhập" },
      { key: "legal", name: "Pháp lý", description: "Sổ, giấy phép, dự án treo" },
      { key: "financing", name: "Lãi suất & vay", description: "Lãi suất, ân hạn, khả năng vay" },
      { key: "supply", name: "Nguồn cung", description: "Dự án mới, mở bán, tồn kho" },
    ],
    configSchema: marketCaseConfigSchema,
    defaultConfig: { segments: ["Căn hộ"], period: "week" },
  },
  brand: {
    roles: [
      {
        role: "primary",
        label: "Chủ đầu tư",
        hint: "Alias gồm tên viết tắt, mã cổ phiếu, tên công ty con",
        placeholder: "VD: Phát Đạt",
        aliasPlaceholder: "VD: PDR, Bất động sản Phát Đạt",
        min: 1,
        max: 1,
      },
      {
        role: "product",
        label: "Dự án của chủ đầu tư",
        hint: "Nhắc tới dự án cũng được tính vào uy tín chủ đầu tư",
        placeholder: "VD: La Pura",
        aliasPlaceholder: "Tên khác",
        min: 0,
        max: 20,
      },
      {
        role: "competitor",
        label: "Chủ đầu tư để so sánh",
        hint: "Dùng để tính Share of Voice",
        placeholder: "VD: Becamex IDC",
        aliasPlaceholder: "Tên khác",
        min: 0,
        max: 10,
      },
    ],
    aspects: [
      { key: "legal", name: "Pháp lý minh bạch", description: "Pháp lý các dự án, sai phạm, thanh tra" },
      { key: "progress", name: "Tiến độ cam kết", description: "Giữ đúng tiến độ xây dựng, bàn giao" },
      { key: "finance", name: "Năng lực tài chính", description: "Nợ, trái phiếu, dòng tiền, cổ phiếu" },
      { key: "quality", name: "Chất lượng sản phẩm", description: "Chất lượng xây dựng và vận hành các dự án" },
      { key: "customer", name: "Cam kết với khách hàng", description: "Hậu mãi, giải quyết khiếu nại, chính sách" },
    ],
    configSchema: brandCaseConfigSchema,
    defaultConfig: { period: "month" },
  },
};
