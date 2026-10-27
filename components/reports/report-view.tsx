"use client";

import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

import { buildKpis } from "@/components/metrics/overview-kpis";
import { SentimentPill } from "@/components/metrics/report-ui/report-ui";
import { Button } from "@/components/ui/button";
import type { ReportCitation, ReportDetail, ReportItem } from "@/lib/reports/types";
import { formatReportPeriod } from "@/lib/reports/utils/format-report-period";
import { cn } from "@/lib/utils";

const SENTIMENT_PILLS = {
  positive: { sentiment: "pos", label: "Tích cực" },
  neutral: { sentiment: "neu", label: "Trung lập" },
  negative: { sentiment: "neg", label: "Tiêu cực" },
} as const;

const KIND_NAMES: Record<string, string> = { post: "Bài", comment: "Bình luận", reply: "Trả lời" };

export function formatGeneratedAt(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

function CitationCard({ citation }: { citation: ReportCitation }) {
  const pill = citation.sentiment
    ? SENTIMENT_PILLS[citation.sentiment as keyof typeof SENTIMENT_PILLS]
    : null;
  const meta = [
    KIND_NAMES[citation.kind] ?? citation.kind,
    citation.author,
    citation.source,
    citation.publishedAt ? formatGeneratedAt(citation.publishedAt) : null,
  ].filter(Boolean);

  return (
    <li className="rounded-xl border border-border bg-muted/40 px-3 py-2">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
        {pill ? <SentimentPill sentiment={pill.sentiment} label={pill.label} /> : null}
        <span>{meta.join(" · ")}</span>
        {citation.url ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Mở bài gốc <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </div>
      <p className="text-[13px] leading-relaxed">{citation.text}</p>
    </li>
  );
}

function CitedItem({ item, citations }: { item: ReportItem; citations: Map<string, ReportCitation> }) {
  const [open, setOpen] = useState(false);
  const cited = item.mentionIds
    .map((id) => citations.get(id))
    .filter((citation): citation is ReportCitation => Boolean(citation));

  return (
    <li className="flex flex-col gap-1.5">
      <p className="text-[14px] leading-relaxed">
        <b className="font-semibold">{item.title}</b> {item.body}
      </p>
      {cited.length > 0 ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-fit gap-1 px-2 text-[12px] text-muted-foreground"
            onClick={() => setOpen((value) => !value)}
          >
            Dẫn chứng ({cited.length})
            <ChevronDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </Button>
          {open ? (
            <ul className="flex flex-col gap-2">
              {cited.map((citation) => (
                <CitationCard key={citation.mentionId} citation={citation} />
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="font-heading text-[15px] font-bold">{title}</h3>
      {children}
    </section>
  );
}

/** One AI report as in the demo: summary, key figures, highlights, risks, recommendations (D29). */
export function ReportView({ report }: { report: ReportDetail }) {
  const citations = new Map(report.citations.map((citation) => [citation.mentionId, citation]));
  const kpis = buildKpis(report.metrics.overview);
  const { sections } = report;

  return (
    <article className="flex flex-col gap-5 rounded-[22px] border-[1.5px] border-border bg-card px-5 py-5 md:px-6">
      <header>
        <h2 className="font-heading text-[19px] font-bold">{report.metrics.projectName}</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {formatReportPeriod(report)}
          {report.complete ? "" : " · kỳ chưa kết thúc"}
          {` · Tạo tự động bởi BNB Listening AI lúc ${formatGeneratedAt(report.generatedAt)}`}
        </p>
      </header>

      <ReportSection title="Tóm tắt điều hành">
        <p className="max-w-[90ch] text-[14px] leading-relaxed">{sections.summary}</p>
      </ReportSection>

      <ReportSection title="Số liệu chính">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[13.5px]">
            <tbody>
              {kpis.map((kpi) => (
                <tr key={kpi.label} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-muted-foreground">{kpi.label}</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">{kpi.value}</td>
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums",
                      kpi.good ? "text-[var(--positive)]" : "text-[var(--negative)]",
                    )}
                  >
                    {kpi.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      {sections.highlights.length > 0 ? (
        <ReportSection title="Điểm nổi bật">
          <ul className="flex flex-col gap-3">
            {sections.highlights.map((item) => (
              <CitedItem key={item.title} item={item} citations={citations} />
            ))}
          </ul>
        </ReportSection>
      ) : null}

      {sections.risks.length > 0 ? (
        <ReportSection title="Rủi ro cần lưu ý">
          <ul className="flex flex-col gap-3">
            {sections.risks.map((item) => (
              <CitedItem key={item.title} item={item} citations={citations} />
            ))}
          </ul>
        </ReportSection>
      ) : null}

      {sections.recommendations.length > 0 ? (
        <ReportSection title="Khuyến nghị hành động">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed">
            {sections.recommendations.map((item) => (
              <li key={item.title}>
                <b className="font-semibold">{item.title}</b> {item.body}
              </li>
            ))}
          </ol>
        </ReportSection>
      ) : null}

      {report.warnings.length > 0 ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-[12px] text-muted-foreground">
          Kiểm tra tự động: {report.warnings.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
