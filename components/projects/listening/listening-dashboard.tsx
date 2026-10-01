"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type ListeningDashboardProps = {
  projectName: string;
};

export function ListeningDashboard({ projectName }: ListeningDashboardProps) {
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

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {projectName}
            </h1>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Dữ liệu demo
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Social listening · {demo.rangeLabel}
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

      <ListeningSummaryCard key={period} demo={demo} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Thảo luận"
          value={formatCount(demo.mentions.value)}
          delta={formatSignedPercent(demo.mentions.deltaPercent)}
          hint={`${formatCount(demo.authors)} người lên tiếng`}
        />
        <Kpi
          label="Độ phủ"
          value={formatCompact(demo.reach.value)}
          delta={formatSignedPercent(demo.reach.deltaPercent)}
          hint="Ước tính lượt tiếp cận"
        />
        <Kpi
          label="Tương tác"
          value={formatCompact(demo.engagement.value)}
          delta={formatSignedPercent(demo.engagement.deltaPercent)}
          hint="Phản ứng, bình luận, chia sẻ"
        />
        <Kpi
          label="Sắc thái ròng"
          value={formatSignedPoints(demo.netSentiment.value).replace(" điểm", "")}
          delta={formatSignedPoints(demo.netSentiment.deltaPoints)}
          deltaTone={sentimentDeltaTone}
          hint="Thang −100 đến +100"
        />
        <Kpi
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
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  hint,
  deltaTone = "neutral",
}: {
  label: string;
  value: string;
  delta: string;
  hint: string;
  deltaTone?: "up" | "down" | "neutral";
}) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          <DeltaText tone={deltaTone}>{delta}</DeltaText>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
