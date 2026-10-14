import { z } from "zod";

import type { AlertRuleSeed } from "./alert-templates";
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

/** Config shape a version upgrade rewrites; see `upgrade.migrate`. */
export type CaseUpgradeValues = {
  caseConfig: Record<string, unknown>;
  entities: { id: string; role: EntityRole; name: string; aliases?: string[] }[];
  aspects: { id: string; key?: string; name: string; description?: string }[];
};

export const PRICE_UNITS = ["trieu_m2", "ty_can", "trieu_thang", "khac"] as const;
export const PRICE_KINDS = ["rao_ban", "cho_thue", "gia_cdt", "khac"] as const;

const priceQuoteSchema = z.object({
  amount: z.number().describe("Số tiền, chỉ phần số, ví dụ 46 hoặc 2.5"),
  unit: z.enum(PRICE_UNITS).describe("triệu/m², tỷ/căn, triệu/tháng (giá thuê) hoặc khác"),
  kind: z.enum(PRICE_KINDS).describe("Giá rao bán lại, giá cho thuê, giá chủ đầu tư công bố, hoặc khác"),
  quote: z.string().describe("Đoạn văn bản nhắc tới giá, giữ nguyên"),
});

/** A field Enrich extracts for one case; stored in `mention_extractions` (D14). */
export type CaseExtraction = {
  key: string;
  label: string;
  /** Instruction for the Enrich prompt. */
  description: string;
  /** True: zero or more per mention. False: at most one. */
  many: boolean;
  schema: z.ZodObject<z.ZodRawShape>;
};

const PRICE_QUOTE: CaseExtraction = {
  key: "price_quote",
  label: "Giá được nhắc",
  description: "Mỗi mức giá cụ thể được nhắc tới (rao bán, cho thuê, giá chủ đầu tư). Bỏ qua nếu không có con số.",
  many: true,
  schema: priceQuoteSchema,
};

const BUYER_QUESTION: CaseExtraction = {
  key: "buyer_question",
  label: "Câu hỏi của người mua",
  description: "Khi mục là câu hỏi của người đang cân nhắc mua hoặc thuê: chủ đề và câu hỏi.",
  many: false,
  schema: z.object({
    topic: z.string().describe("Chủ đề ngắn: pháp lý, giá, tiến độ, vay, tiện ích…"),
    question: z.string().describe("Câu hỏi, viết gọn"),
  }),
};

const AREA_PRICE_QUOTE: CaseExtraction = {
  ...PRICE_QUOTE,
  description: "Mỗi mức giá cụ thể được nhắc tới, kèm khu vực của mức giá đó nếu xác định được.",
  schema: priceQuoteSchema.extend({
    area: z.string().nullable().describe("Tên khu vực của mức giá, null nếu không rõ"),
  }),
};

export type CaseTemplate = {
  /** Starts at 1; a project keeps its version until the user upgrades it. */
  version: number;
  roles: CaseEntityRole[];
  aspects: CaseAspectTemplate[];
  configSchema: z.ZodType<Record<string, unknown>>;
  defaultConfig: Record<string, unknown>;
  /** Rules a new project of this version starts with. */
  alertSeeds: AlertRuleSeed[];
  /** Case-specific fields Enrich extracts. */
  extractions: CaseExtraction[];
  /**
   * How a project moves here from the previous version. `notes` are shown in
   * the upgrade banner; `migrate` prefills the new form, which the user then
   * reviews and completes before saving.
   */
  upgrade?: {
    notes: string[];
    migrate: (values: CaseUpgradeValues) => CaseUpgradeValues;
  };
};

/**
 * Versions of each case, oldest first (docs/decisions.md D10). Old versions
 * stay here as long as any project runs on them.
 */
export const CASE_VERSIONS: Record<AvailableProjectCase, CaseTemplate[]> = {
  project: [{
    version: 1,
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
    extractions: [PRICE_QUOTE, BUYER_QUESTION],
    alertSeeds: [
      { kind: "negative_share", scope: { type: "aspect_key", key: "legal" } },
      { kind: "negative_share", scope: { type: "aspect_key", key: "progress" } },
      { kind: "buyer_questions_growth", scope: { type: "project" } },
      { kind: "viral_post", scope: { type: "first_of_role", role: "primary" } },
      { kind: "price_deviation", scope: { type: "project" }, enabled: false },
    ],
  }],
  market: [{
    version: 1,
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
    extractions: [AREA_PRICE_QUOTE],
    alertSeeds: [
      { kind: "volume_growth", scope: { type: "each_role", role: "area" } },
      {
        kind: "keyword_hit",
        scope: { type: "project" },
        threshold: 5,
        window: "7d",
        keywords: ["cắt lỗ", "bán gấp", "ngộp", "giảm sâu"],
      },
      { kind: "negative_share", scope: { type: "aspect_key", key: "financing" }, window: "7d" },
    ],
  }],
  brand: [{
    version: 1,
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
    extractions: [],
    alertSeeds: [
      { kind: "negative_share", scope: { type: "first_of_role", role: "primary" }, threshold: 20 },
      {
        kind: "keyword_hit",
        scope: { type: "first_of_role", role: "primary" },
        keywords: ["lừa đảo", "khởi tố", "thanh tra", "vỡ nợ", "chậm bàn giao"],
      },
      { kind: "volume_growth", scope: { type: "aspect_key", key: "finance" }, window: "24h" },
      { kind: "viral_post", scope: { type: "first_of_role", role: "primary" } },
    ],
  }],
};

export function latestCaseVersion(projectCase: AvailableProjectCase): number {
  const versions = CASE_VERSIONS[projectCase];
  return versions[versions.length - 1].version;
}

export function hasCaseVersion(projectCase: AvailableProjectCase, version: number): boolean {
  return CASE_VERSIONS[projectCase].some((item) => item.version === version);
}

/** Template of a case version; the latest when `version` is omitted or unknown. */
export function getCaseTemplate(
  projectCase: AvailableProjectCase,
  version?: number,
): CaseTemplate {
  const versions = CASE_VERSIONS[projectCase];
  return (
    versions.find((item) => item.version === version) ?? versions[versions.length - 1]
  );
}

/** Versions after `from`, in order, for the upgrade banner and migration chain. */
export function caseUpgradesAfter(
  projectCase: AvailableProjectCase,
  from: number,
): CaseTemplate[] {
  return CASE_VERSIONS[projectCase].filter((item) => item.version > from);
}
