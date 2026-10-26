"use client";

import { FileBarChartIcon, Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import type { MetricsApiScope } from "@/components/metrics/use-metrics-api";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { ReportPeriod } from "@/lib/metrics/types";
import type { ReportListItem } from "@/lib/reports/types";
import { formatReportPeriod } from "@/lib/reports/utils/format-report-period";
import { cn } from "@/lib/utils";

import { GenerateReportDialog } from "./generate-report-dialog";
import { formatGeneratedAt, ReportView } from "./report-view";
import { useGenerateReport, useReport, useReports } from "./use-reports-api";

const REPORT_PARAM = "report";

/** The period to regenerate a report with: the same days as before (D29). */
function samePeriod(report: ReportListItem): ReportPeriod {
  if (report.periodType === "custom" || report.periodType === "rolling") {
    return { type: "custom", from: report.periodStart, to: report.periodEnd };
  }
  return { type: report.periodType as Exclude<ReportPeriod["type"], "rolling" | "custom">, date: report.periodStart };
}

/** "Báo cáo AI" of real projects: one report at a time, older ones listed below (D29). */
export function ProjectReportPage({
  scope,
  projectName,
  banner,
  canGenerate,
}: {
  scope: MetricsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const reports = useReports(scope);
  const generate = useGenerateReport(scope);
  const items = reports.data?.items ?? [];
  const selectedId = searchParams.get(REPORT_PARAM) ?? items[0]?.id ?? null;
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const report = useReport(scope, selectedId);

  function select(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set(REPORT_PARAM, id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function runGenerate(period: ReportPeriod) {
    try {
      const created = await generate.mutateAsync(period);
      toast.add({ title: `Đã tạo báo cáo ${formatReportPeriod(created)}.`, type: "success" });
      setDialogOpen(false);
      select(created.id);
    } catch (error) {
      toast.add({ title: error instanceof Error ? error.message : "Không tạo được báo cáo.", type: "error" });
    }
  }

  return (
    <div className={projectReportPageClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-[22px] leading-none font-bold tracking-[-0.015em]">
            Báo cáo AI
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {projectName} · AI viết theo số liệu và đề cập của kỳ, không có người duyệt
          </p>
        </div>
        {canGenerate ? (
          <div className="flex flex-wrap items-center gap-2">
            {selected ? (
              <Button
                variant="outline"
                size="sm"
                disabled={generate.isPending}
                onClick={() => runGenerate(samePeriod(selected))}
              >
                {generate.isPending && !dialogOpen ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Tạo lại
              </Button>
            ) : null}
            <Button size="sm" disabled={generate.isPending} onClick={() => setDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Tạo báo cáo
            </Button>
          </div>
        ) : null}
      </div>
      <ProjectPageBanner {...banner} />

      {reports.error ? <p className="text-sm text-destructive">{reports.error.message}</p> : null}
      {report.error ? <p className="text-sm text-destructive">{report.error.message}</p> : null}

      {reports.isPending || (selectedId && report.isPending) ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Đang tải báo cáo…
        </p>
      ) : report.data ? (
        <ReportView report={report.data} />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-border px-6 py-12 text-center text-muted-foreground">
          <FileBarChartIcon className="size-8 opacity-40" />
          <p className="text-sm">
            Chưa có báo cáo. Báo cáo tự tạo khi hết mỗi kỳ theo lịch trong cài đặt project
            {canGenerate ? ", hoặc bấm Tạo báo cáo." : "."}
          </p>
        </div>
      )}

      {items.length > 0 ? (
        <section className="rounded-[22px] border-[1.5px] border-border bg-card px-5 py-4">
          <h3 className="mb-2 font-heading text-[14.5px] font-bold">Các báo cáo đã tạo</h3>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => select(item.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-lg px-2 py-2.5 text-left hover:bg-muted md:flex-row md:items-baseline md:gap-4",
                    item.id === selectedId && "bg-muted",
                  )}
                >
                  <span className="shrink-0 text-[13.5px] font-semibold md:w-56">
                    {formatReportPeriod(item)}
                    {item.complete ? "" : " (chưa hết kỳ)"}
                  </span>
                  <span className="line-clamp-1 min-w-0 flex-1 text-[13px] text-muted-foreground">
                    {item.summary}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {formatGeneratedAt(item.generatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <GenerateReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={generate.isPending}
        onGenerate={runGenerate}
      />
    </div>
  );
}
