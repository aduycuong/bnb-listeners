"use client";

import Link from "next/link";

import { DemoGrid, DemoPanel, DemoTable, SentimentPill } from "@/components/projects/demo/demo-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { AQUA_PAGE_META } from "@/lib/projects/aqua-demo";
import type { AlertLevel, AlertStatus } from "@/lib/alerts/types";

import { MetricsEmpty } from "../metrics/metrics-page-header";
import { useProjectAlerts, type AlertsApiScope } from "./use-alerts-api";

const LEVEL_LABEL: Record<AlertLevel, string> = {
  high: "Cao",
  med: "Trung bình",
  low: "Thấp",
};

const STATUS_LABEL: Record<AlertStatus, string> = {
  open: "Chỉ ghi nhận",
  emailed: "Đã gửi email",
  email_failed: "Chưa gửi được email",
};

/** Alerts page: firings from the hourly evaluator, and the rules that are on. */
export function ProjectAlertsPage({
  scope,
  projectName,
  banner,
  settingsHref,
}: {
  scope: AlertsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
  settingsHref: string;
}) {
  const { data, error, isPending, isFetching } = useProjectAlerts(scope);
  const loading = isPending ? "Đang tải…" : null;

  return (
    <div className={projectReportPageClassName}>
      <div className="min-w-0">
        <h1 className="font-heading text-[22px] leading-none font-bold tracking-[-0.015em]">
          {AQUA_PAGE_META.alerts.title}
        </h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {projectName} · kiểm tra mỗi giờ · chỉ gửi email
          {isFetching && !isPending ? " · đang tải…" : ""}
        </p>
      </div>
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <DemoGrid>
        <DemoPanel
          title="Cảnh báo gần đây"
          span="s7"
          scope="common"
          note="Mới nhất trước. Cùng một quy tắc không lặp lại trong cửa sổ của nó."
        >
          {error ? (
            <MetricsEmpty>Không tải được cảnh báo.</MetricsEmpty>
          ) : data && data.alerts.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {data.alerts.map((alert) => (
                <li key={alert.id} className="rounded-xl border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SentimentPill sentiment={alert.level} label={LEVEL_LABEL[alert.level]} />
                    <b className="text-sm">{alert.title}</b>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatAlertTime(alert.triggeredAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{alert.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {STATUS_LABEL[alert.status]}
                    {alert.status === "email_failed" && alert.emailError
                      ? ` · ${alert.emailError}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <MetricsEmpty>
              {loading ?? "Chưa có cảnh báo. Quy tắc được kiểm tra mỗi giờ."}
            </MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Quy tắc đang bật"
          span="s5"
          scope="common"
          note={
            <>
              Chỉnh trong{" "}
              <Link href={settingsHref} className="font-semibold text-primary">
                Cài đặt dự án
              </Link>
              .
              {data && data.recipientCount === 0
                ? " Chưa có email nhận, nên cảnh báo chỉ được ghi lại."
                : ""}
            </>
          }
        >
          {error ? (
            <MetricsEmpty>Không tải được quy tắc.</MetricsEmpty>
          ) : data && data.rules.length > 0 ? (
            <DemoTable
              headers={[
                { label: "Quy tắc" },
                { label: "Ngưỡng" },
                { label: "Khoảng" },
                { label: "Gửi" },
              ]}
              rows={data.rules.map((rule) => [
                <span key={rule.id}>
                  <b className="block">{rule.label}</b>
                  <span className="text-xs text-muted-foreground">{rule.scope}</span>
                </span>,
                rule.threshold,
                rule.window,
                rule.deliversEmail ? "Email" : "Không gửi",
              ])}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa bật quy tắc nào."}</MetricsEmpty>
          )}
        </DemoPanel>
      </DemoGrid>
    </div>
  );
}

function formatAlertTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
