import { z } from "zod";

import {
  CORE_ENRICHERS,
  describeEnrichers,
  ENRICHER_KEYS,
  type EnricherKey,
  isReadyEnricher,
} from "@/lib/enrichment/registry";

import type { AlertRuleSeed } from "./alert-templates";
import type { AvailableProjectCase } from "./project-cases";

/** `subject`: what the project tracks, exactly one (D30). `product`: a project of the developer (`brand`). */
export const ENTITY_ROLES = ["subject", "product"] as const;

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

/**
 * Enrichers a case runs on top of `CORE_ENRICHERS` (D18). `case` ones are
 * enabled for every project of the case; `optional` ones can be turned on per
 * project. Keys with `status: planned` in the registry are shown as coming
 * soon and never scheduled.
 */
export type CaseEnrichers = {
  case: EnricherKey[];
  optional: EnricherKey[];
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
  /** Enrichers of this case beyond the core ones. */
  enrichers: CaseEnrichers;
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
        role: "subject",
        label: "Dự án theo dõi",
        hint: "Tên thương mại; alias gồm tên phân khu, tên cũ, cách viết tắt",
        placeholder: "VD: La Pura",
        aliasPlaceholder: "VD: Zenia, Astral City",
        min: 1,
        max: 1,
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
    enrichers: {
      case: ["price_quote", "buyer_question", "question_assign"],
      optional: ["buyer_intent", "concern"],
    },
    alertSeeds: [
      { kind: "negative_share", scope: { type: "aspect_key", key: "legal" } },
      { kind: "negative_share", scope: { type: "aspect_key", key: "progress" } },
      { kind: "buyer_questions_growth", scope: { type: "project" } },
      { kind: "viral_post", scope: { type: "project" } },
      { kind: "price_deviation", scope: { type: "project" }, enabled: false },
    ],
  }],
  market: [{
    version: 1,
    roles: [
      {
        role: "subject",
        label: "Khu vực theo dõi",
        hint: "Alias gồm tên trước sáp nhập, cách viết tắt, tên tuyến đường quen gọi",
        placeholder: "VD: Thuận An",
        aliasPlaceholder: "VD: Lái Thiêu, TA",
        min: 1,
        max: 1,
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
    enrichers: { case: ["price_quote"], optional: ["buyer_question", "question_assign"] },
    alertSeeds: [
      { kind: "volume_growth", scope: { type: "project" } },
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
        role: "subject",
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
    enrichers: { case: ["entities"], optional: ["stance", "violation"] },
    alertSeeds: [
      { kind: "negative_share", scope: { type: "project" }, threshold: 20 },
      {
        kind: "keyword_hit",
        scope: { type: "project" },
        keywords: ["lừa đảo", "khởi tố", "thanh tra", "vỡ nợ", "chậm bàn giao"],
      },
      { kind: "volume_growth", scope: { type: "aspect_key", key: "finance" }, window: "24h" },
      { kind: "viral_post", scope: { type: "project" } },
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

/**
 * Enrichers a project of this case runs by default: core ones plus the case's
 * own, in registry order. Planned ones are left out.
 */
export function defaultCaseEnrichers(template: CaseTemplate): EnricherKey[] {
  const keys = new Set<EnricherKey>([...CORE_ENRICHERS, ...template.enrichers.case]);
  return ENRICHER_KEYS.filter((key) => keys.has(key) && isReadyEnricher(key));
}

/** Extraction schemas this case can store, for the mentions filter. */
export function caseExtractionSchemas(template: CaseTemplate) {
  return describeCaseEnrichment(template).flatMap((entry) =>
    entry.writes === "mention_extractions" && entry.status === "ready"
      ? [{ key: entry.key, label: entry.label }]
      : [],
  );
}

/** Every enricher a case can run, with its origin and status, for settings and docs. */
export function describeCaseEnrichment(template: CaseTemplate) {
  const origin = (key: EnricherKey): "core" | "case" | "optional" =>
    CORE_ENRICHERS.includes(key) ? "core" : template.enrichers.case.includes(key) ? "case" : "optional";
  return describeEnrichers([
    ...CORE_ENRICHERS,
    ...template.enrichers.case,
    ...template.enrichers.optional,
  ]).map((entry) => ({ ...entry, origin: origin(entry.key) }));
}

/** Versions after `from`, in order, for the upgrade banner and migration chain. */
export function caseUpgradesAfter(
  projectCase: AvailableProjectCase,
  from: number,
): CaseTemplate[] {
  return CASE_VERSIONS[projectCase].filter((item) => item.version > from);
}
