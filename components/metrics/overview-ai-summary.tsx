"use client";

import Link from "next/link";
import { useState } from "react";

import { ReportPanel } from "@/components/metrics/report-ui/report-ui";
import { formatGeneratedAt } from "@/components/reports/report-view";
import { useReport, useReports } from "@/components/reports/use-reports-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useProjectChatWidget } from "@/components/chat-widget/project-chat-widget-provider";
import { formatReportPeriod } from "@/lib/reports/utils/format-report-period";

import type { MetricsApiScope } from "./use-metrics-api";

const HIGHLIGHTS = 3;

/**
 * Highlights of the project's latest AI report (D29). The question box and chips hand off to the
 * project's BNB chat widget; without it they point to the AI connection page.
 */
export function OverviewAiSummary({
  scope,
  reportHref,
  connectHref,
}: {
  scope: MetricsApiScope;
  reportHref: string;
  connectHref: string;
}) {
  const reports = useReports(scope);
  const latest = reports.data?.items[0] ?? null;
  const report = useReport(scope, latest?.id ?? null);
  const widget = useProjectChatWidget();
  const [question, setQuestion] = useState("");
  const [needsWidget, setNeedsWidget] = useState(false);
  const chips = report.data?.sections.suggestedQuestions ?? [];
  const highlights = report.data?.sections.highlights.slice(0, HIGHLIGHTS) ?? [];

  /** Opens the widget; with `text` also sends it as a visitor message. Returns whether it ran. */
  function askWidget(text?: string) {
    if (widget.status === "off") {
      setNeedsWidget(true);
      return false;
    }
    setNeedsWidget(false);
    if (widget.status === "loading") {
      toast.add({ title: "Chat widget đang tải, thử lại sau giây lát.", type: "info" });
      return false;
    }
    if (!text) {
      widget.open();
      return true;
    }
    widget.send(text).catch(() => {
      toast.add({ title: "Không gửi được tin nhắn, thử lại sau.", type: "error" });
    });
    return true;
  }

  return (
    <ReportPanel
      title="AI tóm tắt"
      span="s4"
      scope="common"
      invert
      className="h-full"
      note={
        latest ? (
          <span className="text-[#BFD6EE]">
            {formatReportPeriod(latest)} · tạo {formatGeneratedAt(latest.generatedAt)} ·{" "}
            <Link href={`${reportHref}?report=${latest.id}`} className="font-semibold text-white underline">
              Xem báo cáo
            </Link>
          </span>
        ) : undefined
      }
    >
      {reports.isPending || (latest && report.isPending) ? (
        <p className="text-[13px] text-[#CFE3F7]">Đang tải…</p>
      ) : latest && report.data ? (
        highlights.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {highlights.map((item, index) => (
              <li key={item.title} className="flex gap-2.5 text-[13.5px] leading-[1.55]">
                <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white/12 text-[12px] font-semibold">
                  {index + 1}
                </span>
                <span>
                  <b className="font-semibold text-white">{item.title}</b> {item.body}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] leading-[1.55]">{report.data.sections.summary}</p>
        )
      ) : (
        <p className="text-[13px] leading-relaxed text-[#CFE3F7]">
          Chưa có báo cáo AI. Báo cáo tự tạo khi hết mỗi kỳ theo lịch trong cài đặt project, hoặc
          tạo ở{" "}
          <Link href={reportHref} className="font-semibold text-white underline">
            Báo cáo AI
          </Link>
          .
        </p>
      )}
      <form
        className="mt-auto flex flex-col gap-2 pt-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          const text = question.trim();
          if (askWidget(text || undefined) && text) setQuestion("");
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 py-1 pr-1 pl-4">
          <Input
            placeholder="Hỏi AI về dữ liệu này…"
            aria-label="Câu hỏi cho AI"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onClick={() => askWidget()}
            className="h-8 border-0 bg-transparent px-0 text-[13px] text-white shadow-none placeholder:text-[#8FB2D6] focus-visible:border-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="h-8 rounded-full bg-[var(--sun)] px-3 text-[12.5px] font-semibold text-[#4D3400] shadow-none hover:bg-[var(--sun)]/90"
          >
            Hỏi
          </Button>
        </div>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="ghost"
                className="h-7 rounded-full bg-white/8 px-2.5 text-[12px] font-medium text-[#CFE3F7] hover:bg-white/12 hover:text-white"
                onClick={() => askWidget(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>
        ) : null}
        {needsWidget ? (
          <p className="text-[12.5px] text-[#CFE3F7]">
            Hãy bật BNB Chat widget cho chức năng này ở{" "}
            <Link href={connectHref} className="font-semibold text-white underline">
              Kết nối AI
            </Link>
            .
          </p>
        ) : null}
      </form>
    </ReportPanel>
  );
}
