"use client";

import { useState } from "react";
import { useT } from "next-i18next/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProjectDemoSection } from "@/lib/dashboard/nav-items";
import { PROJECT_CASE_ICONS, type ProjectCase } from "@/lib/projects/project-cases";
import {
  getListeningDemo,
  LISTENING_PERIOD_LABELS,
  LISTENING_PERIODS,
  type ListeningPeriod,
} from "@/lib/projects/listening-demo-data";

import { ListeningAudienceCard } from "./listening-audience-card";
import { ListeningMentionsCard } from "./listening-mentions-card";
import { ListeningPlacesCard } from "./listening-places-card";
import { ListeningSentimentCard } from "./listening-sentiment-card";
import { ListeningSummaryCard } from "./listening-summary-card";
import { ListeningTopicsCard } from "./listening-topics-card";
import {
  DeltaText,
  formatCompact,
  formatCount,
  formatShare,
  formatSignedPercent,
  formatSignedPoints,
} from "./listening-ui";
import { ListeningVolumeChart } from "./listening-volume-chart";

type ListeningSection = "overview" | ProjectDemoSection;

type ListeningDashboardProps = {
  projectName: string;
  projectDescription: string | null;
  projectCase: ProjectCase;
  section?: ListeningSection;
};

const SECTION_TITLE_KEY: Record<ListeningSection, string> = {
  overview: "nav.projectOverview",
  mentions: "nav.mentions",
  sentiment: "nav.sentiment",
  topics: "nav.topics",
  channels: "nav.channels",
  authors: "nav.authors",
  case: "nav.caseSpecial",
  alerts: "nav.alerts",
  report: "nav.report",
};

const KPI_TILES = [
  "border-0 bg-primary text-white",
  "border-0 bg-[var(--tile-mint)]",
  "border-0 bg-[var(--tile-sun)]",
  "border-0 bg-[var(--tile-blue)]",
  "border-0 bg-[var(--tile-violet)]",
] as const;

export function ListeningDashboard({
  projectName,
  projectDescription,
  projectCase,
  section = "overview",
}: ListeningDashboardProps) {
  const { t } = useT("dashboard");
  const [period, setPeriod] = useState<ListeningPeriod>("30d");
  const demo = getListeningDemo(period);
  const sentimentDeltaTone =
    demo.netSentiment.deltaPoints > 0
      ? "up"
      : demo.netSentiment.deltaPoints < 0
        ? "down"
        : "neutral";
  const negativeTone =
    demo.negativeShare.deltaPoints < 0
      ? "up"
      : demo.negativeShare.deltaPoints > 0
        ? "down"
        : "neutral";
  const titleKey =
    section === "case" ? `caseNav.${projectCase}` : SECTION_TITLE_KEY[section];

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-7 md:pt-5 md:pb-10">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold">{t(titleKey)}</h1>
          <p className="text-[12.5px] text-muted-foreground">
            {projectName} · {demo.rangeLabel}
          </p>
        </div>
        <Tabs
          value={period}
          onValueChange={(value) => {
            if (value === "7d" || value === "30d" || value === "90d") {
              setPeriod(value);
            }
          }}
        >
          <TabsList>
            {LISTENING_PERIODS.map((item) => (
              <TabsTrigger key={item} value={item}>
                {LISTENING_PERIOD_LABELS[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <section className="grid items-center gap-4 rounded-[22px] bg-[var(--tile-blue)] px-5 py-4 md:grid-cols-[auto_1fr_auto]">
        <div className="grid size-11 place-items-center rounded-2xl bg-white text-[22px]">
          {PROJECT_CASE_ICONS[projectCase]}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold">
            {t(`cases.${projectCase}`)}
            <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 align-middle text-[11.5px] font-semibold text-white">
              Demo
            </span>
          </h2>
          <p className="mt-0.5 max-w-[85ch] text-[13px] text-muted-foreground">
            {projectDescription}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground md:text-right">
          <b className="text-foreground">{projectName}</b>
          <br />
          {demo.comparisonLabel}
        </p>
      </section>

      {section === "overview" ? (
        <>
          <ListeningSummaryCard key={period} demo={demo} />
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              tile={KPI_TILES[0]}
              lead
              label="Thảo luận"
              value={formatCount(demo.mentions.value)}
              delta={formatSignedPercent(demo.mentions.deltaPercent)}
              hint={`${formatCount(demo.authors)} người lên tiếng`}
              deltaTone={
                demo.mentions.deltaPercent > 0
                  ? "up"
                  : demo.mentions.deltaPercent < 0
                    ? "down"
                    : "neutral"
              }
            />
            <Kpi
              tile={KPI_TILES[1]}
              label="Độ phủ"
              value={formatCompact(demo.reach.value)}
              delta={formatSignedPercent(demo.reach.deltaPercent)}
              hint="Ước tính lượt tiếp cận"
            />
            <Kpi
              tile={KPI_TILES[2]}
              label="Tương tác"
              value={formatCompact(demo.engagement.value)}
              delta={formatSignedPercent(demo.engagement.deltaPercent)}
              hint="Phản ứng, bình luận, chia sẻ"
            />
            <Kpi
              tile={KPI_TILES[3]}
              label="Sắc thái ròng"
              value={formatSignedPoints(demo.netSentiment.value).replace(
                " điểm",
                "",
              )}
              delta={formatSignedPoints(demo.netSentiment.deltaPoints)}
              deltaTone={sentimentDeltaTone}
              hint="Thang −100 đến +100"
            />
            <Kpi
              tile={KPI_TILES[4]}
              label="Thảo luận tiêu cực"
              value={formatShare(demo.negativeShare.value)}
              delta={formatSignedPoints(demo.negativeShare.deltaPoints)}
              deltaTone={negativeTone}
              hint="Phần trong tổng thảo luận"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <ListeningVolumeChart demo={demo} />
            </div>
            <ListeningSentimentCard demo={demo} />
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <ListeningTopicsCard demo={demo} />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <ListeningAudienceCard demo={demo} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <ListeningMentionsCard demo={demo} />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <ListeningPlacesCard demo={demo} />
            </div>
          </section>
        </>
      ) : null}

      {section === "mentions" ? <ListeningMentionsCard demo={demo} /> : null}
      {section === "sentiment" ? <ListeningSentimentCard demo={demo} /> : null}
      {section === "topics" ? <ListeningTopicsCard demo={demo} /> : null}
      {section === "channels" ? <ListeningPlacesCard demo={demo} /> : null}
      {section === "authors" ? <ListeningAudienceCard demo={demo} /> : null}
      {section === "case" || section === "alerts" ? (
        <ListeningSummaryCard key={period} demo={demo} />
      ) : null}
      {section === "report" ? (
        <Card>
          <CardHeader>
            <CardTitle>Báo cáo demo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-[82ch] text-sm leading-relaxed">{demo.brief}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  hint,
  deltaTone = "neutral",
  lead = false,
  tile,
}: {
  label: string;
  value: string;
  delta: string;
  hint: string;
  deltaTone?: "up" | "down" | "neutral";
  lead?: boolean;
  tile: string;
}) {
  return (
    <Card size="sm" className={tile}>
      <CardContent>
        <p className={lead ? "text-[12.5px] text-white/90" : "text-[12.5px] text-muted-foreground"}>
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs">
          {lead ? (
            <span className="font-semibold text-white">{delta}</span>
          ) : (
            <DeltaText tone={deltaTone}>{delta}</DeltaText>
          )}
          <span className={lead ? "ml-1 text-white/75" : "ml-1 text-muted-foreground"}>
            {hint}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
