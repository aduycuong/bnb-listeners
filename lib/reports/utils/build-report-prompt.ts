import { growthPercent } from "@/lib/metrics/formulas";

import { REPORT_CONFIG } from "../config";
import type { ReportEvidence, ReportMetrics } from "../types";

const PERIOD_NAMES: Record<string, string> = {
  day: "ngày",
  week: "tuần",
  month: "tháng",
  quarter: "quý",
  year: "năm",
  rolling: "khoảng ngày",
  custom: "khoảng ngày",
};

const KIND_NAMES: Record<string, string> = { post: "bài", comment: "bình luận", reply: "trả lời" };

const SENTIMENT_NAMES: Record<string, string> = {
  positive: "tích cực",
  neutral: "trung lập",
  negative: "tiêu cực",
};

function points(current: number | null, previous: number | null) {
  return current !== null && previous !== null ? Math.round((current - previous) * 10) / 10 : null;
}

/**
 * The numbers the model may quote (D29): the snapshot trimmed, with the changes against the
 * period compared already computed so the model does not compute its own.
 */
export function buildReportFacts(metrics: ReportMetrics) {
  const { overview, period } = metrics;
  const caseMetrics = metrics.caseMetrics;

  return {
    project: metrics.projectName,
    case: metrics.case,
    period: {
      type: period.type,
      from: period.start,
      to: period.end,
      days: period.days,
      complete: period.complete,
      comparedFrom: period.previousStart,
      comparedTo: period.previousEnd,
    },
    kpis: {
      mentions: {
        ...overview.mentions,
        changePct: growthPercent(overview.mentions.current, overview.mentions.previous),
      },
      engagement: {
        ...overview.engagement,
        changePct: growthPercent(overview.engagement.current, overview.engagement.previous),
      },
      authors: {
        ...overview.uniqueAuthors,
        changePct: growthPercent(overview.uniqueAuthors.current, overview.uniqueAuthors.previous),
      },
      nss: { ...overview.nss, changePoints: points(overview.nss.current, overview.nss.previous) },
      negativeSharePct: {
        ...overview.negativeShare,
        changePoints: points(overview.negativeShare.current, overview.negativeShare.previous),
      },
    },
    sentiment: overview.sentiment,
    emotions: metrics.sentiment.emotions.filter((item) => item.mentions > 0),
    aspects: metrics.sentiment.aspects
      .filter((aspect) => aspect.mentions > 0)
      .map((aspect) => ({
        name: aspect.name,
        mentions: aspect.mentions,
        positivePct: aspect.positive,
        negativePct: aspect.negative,
      })),
    channels: metrics.channels.channels.slice(0, 6),
    sources: metrics.channels.sources
      .slice(0, 6)
      .map((source) => ({ name: source.name, channel: source.channel, mentions: source.mentions })),
    topics: metrics.topics.items.map((topic) => ({
      name: topic.name,
      mentions: topic.mentions,
      previousMentions: topic.previousMentions,
      growthPct: topic.growth,
      positivePct: topic.positive,
      negativePct: topic.negative,
    })),
    keywords: metrics.topics.keywords.map((keyword) => ({
      keyword: keyword.text,
      mentions: keyword.mentions,
      negativePct: keyword.negative,
    })),
    caseMetrics:
      caseMetrics?.case === "project"
        ? {
            subject: caseMetrics.subjectName,
            resalePriceMedian: caseMetrics.price.median,
            priceRef: caseMetrics.price.priceRef,
            buyerQuestions: {
              ...caseMetrics.questions.total,
              top: caseMetrics.questions.items.map((item) => ({ name: item.name, mentions: item.mentions })),
            },
            aspectNss: caseMetrics.aspects.map((aspect) => ({ name: aspect.name, nss: aspect.nss })),
          }
        : caseMetrics?.case === "brand"
          ? {
              subject: caseMetrics.subjectName,
              reputationIndex: caseMetrics.index,
              pillars: caseMetrics.pillars.map((pillar) => ({ name: pillar.name, score: pillar.score })),
              products: caseMetrics.products,
            }
          : null,
  };
}

function evidenceLine(item: ReportEvidence) {
  const tags = [
    KIND_NAMES[item.kind] ?? item.kind,
    item.sentiment ? SENTIMENT_NAMES[item.sentiment] : null,
    `${item.engagement} tương tác`,
    item.topic ? `chủ đề: ${item.topic}` : null,
    item.aspects.length ? `khía cạnh: ${item.aspects.join(", ")}` : null,
  ].filter(Boolean);
  const root = item.rootText ? ` | trả lời bài: ${item.rootText}` : "";
  return `[${item.label}] (${tags.join(" · ")}) ${item.text.replace(/\s+/g, " ")}${root}`;
}

/** System and user messages of the report call; `unknownNumbers` asks to fix a previous answer. */
export function buildReportPrompt(params: {
  facts: ReturnType<typeof buildReportFacts>;
  evidence: ReportEvidence[];
  unknownNumbers?: string[];
}) {
  const periodName = PERIOD_NAMES[params.facts.period.type] ?? "kỳ";
  const system = [
    "Bạn viết báo cáo social listening bất động sản bằng tiếng Việt cho ban lãnh đạo và bộ phận truyền thông.",
    `Báo cáo cho ${periodName} từ ${params.facts.period.from} đến ${params.facts.period.to}, so với kỳ từ ${params.facts.period.comparedFrom} đến ${params.facts.period.comparedTo}.`,
    "Quy tắc:",
    "- Chỉ dùng con số có trong FACTS, viết theo kiểu Việt Nam (34.260; 15,2%). Không tự tính số mới, không làm tròn khác đi, không viết tắt K hay tr.",
    "- Mỗi điểm nổi bật và rủi ro dựa trên đề cập trong EVIDENCE, trích 1–3 nhãn (M1, M2…) vào `citations`; không viết nhãn trong lời văn.",
    "- Không bịa sự kiện, tên người, tên dự án ngoài FACTS và EVIDENCE. Khi dữ liệu ít, nói rõ là ít.",
    "- Tên chỉ số trong lời văn: `nss` viết là NSS (chỉ số cảm xúc ròng, −100 đến +100, không phải NPS); `negativeSharePct` là tỷ lệ tiêu cực; `changePct` là % thay đổi; `changePoints` là chênh lệch theo điểm.",
    `- Tối đa ${REPORT_CONFIG.maxItems} mục mỗi phần, câu ngắn, giọng trung tính. Khuyến nghị là việc cụ thể truyền thông có thể làm.`,
    params.facts.period.complete
      ? ""
      : `- Kỳ chưa kết thúc: câu đầu của tóm tắt nói rõ số liệu tính đến hết ngày ${params.facts.period.to}, so với cùng số ngày đầu kỳ trước.`,
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    "FACTS (JSON):",
    JSON.stringify(params.facts),
    "",
    `EVIDENCE (${params.evidence.length} đề cập của kỳ):`,
    ...params.evidence.map(evidenceLine),
    ...(params.unknownNumbers?.length
      ? [
          "",
          `Bản trước có số không có trong FACTS: ${params.unknownNumbers.join(", ")}. Viết lại, bỏ hoặc thay bằng số trong FACTS.`,
        ]
      : []),
  ].join("\n");

  return { system, user };
}
