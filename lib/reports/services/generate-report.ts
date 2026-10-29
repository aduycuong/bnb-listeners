import { HumanMessage, SystemMessage, type AIMessage } from "@langchain/core/messages";
import { sql } from "drizzle-orm";

import { aiReports } from "@/db/schema";
import { db } from "@/lib/db";
import { createChatModel, getChatModelPricing } from "@/lib/langchain";

import { REPORT_CONFIG } from "../config";
import { reportDraftSchema, type ReportDraft } from "../schema";
import type {
  GenerateReportParams,
  ReportCitation,
  ReportDetail,
  ReportEvidence,
  ReportSections,
} from "../types";
import { buildReportFacts, buildReportPrompt } from "../utils/build-report-prompt";
import { collectFactNumbers, findUnknownNumbers } from "../utils/find-unknown-numbers";
import { toReportDetail } from "../utils/to-report-detail";
import { loadReportEvidence } from "./load-report-evidence";
import { loadReportMetrics } from "./load-report-metrics";

const NO_MODEL = "none";

function draftText(draft: ReportDraft) {
  return [
    draft.summary,
    ...draft.suggestedQuestions,
    ...[...draft.highlights, ...draft.risks, ...draft.recommendations].flatMap((item) => [
      item.title,
      item.body,
    ]),
  ].join("\n");
}

/** Model call with one retry when the text quotes numbers the facts do not have (D29). */
async function writeDraft(params: {
  facts: ReturnType<typeof buildReportFacts>;
  evidence: ReportEvidence[];
}) {
  const factNumbers = collectFactNumbers(params.facts);
  const model = createChatModel(REPORT_CONFIG.model, {
    temperature: REPORT_CONFIG.temperature,
  }).withStructuredOutput(reportDraftSchema, { includeRaw: true });

  let draft: ReportDraft | null = null;
  let unknownNumbers: string[] = [];
  const usage = { inputTokens: 0, outputTokens: 0 };
  for (let attempt = 0; attempt <= REPORT_CONFIG.numberRetries; attempt += 1) {
    const prompt = buildReportPrompt({ ...params, unknownNumbers });
    const response = (await model.invoke([
      new SystemMessage(prompt.system),
      new HumanMessage(prompt.user),
    ])) as { parsed: ReportDraft; raw: AIMessage };
    usage.inputTokens += response.raw.usage_metadata?.input_tokens ?? 0;
    usage.outputTokens += response.raw.usage_metadata?.output_tokens ?? 0;
    draft = reportDraftSchema.parse(response.parsed);
    unknownNumbers = findUnknownNumbers(draftText(draft), factNumbers);
    if (unknownNumbers.length === 0) break;
  }

  return { draft: draft!, unknownNumbers, usage };
}

/**
 * Writes the AI report of a project and period (D29): a snapshot of the numbers, sample
 * mentions, then one model call for the summary, highlights, risks and recommendations with
 * citations. Labels the model made up are dropped; numbers missing from the snapshot are kept
 * as warnings. Overwrites the report of the same period.
 */
export async function generateReport(params: GenerateReportParams): Promise<ReportDetail> {
  const [metrics, evidence] = await Promise.all([
    loadReportMetrics(params),
    loadReportEvidence(params),
  ]);
  const warnings: string[] = [];
  let sections: ReportSections;
  let citations: ReportCitation[] = [];
  let model: string = REPORT_CONFIG.model;
  let usage = { inputTokens: 0, outputTokens: 0 };

  if (!metrics.reports.kpis.data?.mentions.current || evidence.length === 0) {
    model = NO_MODEL;
    sections = {
      summary: `Không có đề cập nào về ${metrics.projectName} trong kỳ này.`,
      highlights: [],
      risks: [],
      recommendations: [],
    };
  } else {
    const facts = buildReportFacts(metrics);
    const written = await writeDraft({ facts, evidence });
    usage = written.usage;
    if (written.unknownNumbers.length > 0) {
      warnings.push(`Số không có trong số liệu: ${written.unknownNumbers.join(", ")}`);
    }

    const byLabel = new Map(evidence.map((item) => [item.label, item]));
    const invalid = new Set<string>();
    const cite = (labels: string[]) => {
      const ids = new Set<string>();
      for (const label of labels) {
        const item = byLabel.get(label.trim().replace(/^\[|\]$/g, ""));
        if (item) ids.add(item.mentionId);
        else invalid.add(label);
      }
      return [...ids];
    };
    const { draft } = written;
    const toItem = (item: ReportDraft["highlights"][number]) => ({
      title: item.title,
      body: item.body,
      mentionIds: cite(item.citations),
    });
    sections = {
      summary: draft.summary,
      highlights: draft.highlights.map(toItem),
      risks: draft.risks.map(toItem),
      recommendations: draft.recommendations,
      suggestedQuestions: draft.suggestedQuestions.map((q) => q.trim()).filter(Boolean),
    };
    if (invalid.size > 0) warnings.push(`Bỏ nhãn trích dẫn không có: ${[...invalid].join(", ")}`);

    const cited = new Set([...sections.highlights, ...sections.risks].flatMap((item) => item.mentionIds));
    citations = evidence
      .filter((item) => cited.has(item.mentionId))
      .map((item) => ({
        mentionId: item.mentionId,
        kind: item.kind,
        text: item.text,
        author: item.author,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment,
      }));
  }

  const pricing = model === NO_MODEL ? null : getChatModelPricing(REPORT_CONFIG.model);
  const costUsd = pricing
    ? (usage.inputTokens * pricing.inputPerMTok + usage.outputTokens * pricing.outputPerMTok) / 1_000_000
    : 0;
  const values = {
    projectId: params.projectId,
    periodType: metrics.period.type,
    periodStart: metrics.period.start,
    periodEnd: metrics.period.end,
    complete: metrics.period.complete,
    metrics,
    sections,
    citations,
    warnings,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd,
    trigger: params.trigger,
  };
  const [row] = await db
    .insert(aiReports)
    .values(values)
    .onConflictDoUpdate({
      target: [aiReports.projectId, aiReports.periodType, aiReports.periodStart],
      set: { ...values, generatedAt: sql`now()` },
    })
    .returning();

  return toReportDetail(row);
}
