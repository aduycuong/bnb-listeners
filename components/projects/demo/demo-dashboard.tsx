"use client";

import { useMemo, useState } from "react";
import { useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectDemoSection } from "@/lib/dashboard/nav-items";
import {
  AQUA_ALERT_LABEL,
  AQUA_AUTHORS,
  AQUA_CHANNEL_COLORS,
  AQUA_CHANNELS,
  AQUA_PAGE_META,
  AQUA_SENTIMENT_LABEL,
  AQUA_SOURCES,
  channelSentiment,
  discussionHeat,
  formatCount,
  formatShort,
  formatSigned,
  getAquaCase,
  nssByDay,
  sentTotals,
  type AquaCase,
  type AquaSentiment,
} from "@/lib/projects/aqua-demo";
import { PROJECT_CASE_ICONS, type ProjectCase } from "@/lib/projects/project-cases";
import { AQUA_ALERT_RULES, getAquaProfile } from "@/lib/projects/aqua-demo-profile";

import {
  AspectChart,
  ChannelMixChart,
  ChannelSentimentChart,
  DonutChart,
  EmotionChart,
  GrowthChart,
  NssChart,
  TrendChart,
} from "./demo-charts";
import {
  DemoBanner,
  DemoBars,
  DemoGrid,
  DemoKpis,
  DemoPage,
  DemoPanel,
  DemoTable,
  SentimentPill,
} from "./demo-ui";
import { caseWidgets, overviewWidgets } from "./demo-widgets";

type DemoSection = "overview" | ProjectDemoSection;

type AquaDemoDashboardProps = {
  projectName: string;
  projectDescription: string | null;
  projectCase: ProjectCase;
  section?: DemoSection;
  settingsHref: string;
};

const GLOSSARY = [
  ["Lượt đề cập (Mentions)", "Số bài đăng, bình luận, bài báo có chứa từ khóa đang theo dõi."],
  ["Tiếp cận ước tính (Reach)", "Số người có thể đã nhìn thấy nội dung, ước tính từ lượt theo dõi và lượt xem."],
  ["Tương tác (Engagement)", "Tổng lượt thích, bình luận và chia sẻ."],
  ["Chỉ số cảm xúc ròng (NSS)", "(Tích cực − Tiêu cực) / Tổng đề cập × 100, từ −100 đến +100."],
  ["Share of Voice (SOV)", "Tỷ lệ lượt đề cập của thương hiệu trên tổng lượt đề cập của nhóm thương hiệu so sánh."],
  ["Dùng chung / Riêng case", "Nhãn ở góc mỗi khung cho biết khung đó có trong mọi case hay chỉ có ở case đang chọn."],
];

function askAnswer(question: string, data: AquaCase) {
  const body = question.includes("hành động")
    ? data.report.recs[0]
    : `${data.ai[1]?.headline ?? ""} ${data.ai[1]?.body ?? ""}`;
  return `${body} (Bản demo: khi kết nối dữ liệu thật, AI trả lời dựa trên toàn bộ đề cập.)`;
}

function AiPanel({ data }: { data: AquaCase }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function ask(value: string) {
    const next = value.trim();
    if (!next) {
      return;
    }
    setQuestion(next);
    setAnswer(askAnswer(next, data));
  }

  return (
    <DemoPanel title="AI tóm tắt" span="s4" scope="common" invert>
      <ul className="flex flex-col gap-3">
        {data.ai.map((item) => (
          <li key={item.headline} className="flex gap-2.5 text-[13.5px] leading-relaxed">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white/12">
              {item.emoji}
            </span>
            <span>
              <b className="font-semibold text-white">{item.headline}</b> {item.body}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                ask(question);
              }
            }}
            placeholder="Hỏi AI về dữ liệu này…"
            aria-label="Câu hỏi cho AI"
            className="border-white/20 bg-white/10 text-white placeholder:text-white/60"
          />
          <Button
            type="button"
            className="bg-[#FFC93C] text-[#4D3400] shadow-none hover:bg-[#FFC93C]/90"
            onClick={() => ask(question)}
          >
            Hỏi
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Vì sao tiêu cực tăng?", "Đề xuất hành động"].map((chip) => (
            <Button
              key={chip}
              type="button"
              size="sm"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => ask(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
        {answer ? (
          <p className="mt-3 text-[13px] leading-relaxed">
            <b className="text-white">Trả lời mẫu:</b> {answer}
          </p>
        ) : null}
      </div>
    </DemoPanel>
  );
}

function OverviewPage({ data }: { data: AquaCase }) {
  const totals = sentTotals(data.trend);
  const channels = AQUA_CHANNELS.map((label, index) => ({
    label,
    value: data.channels[index],
    display: `${data.channels[index]}%`,
  })).sort((a, b) => b.value - a.value);
  const topics = [...data.topics]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 6)
    .map((topic) => ({ label: topic.name, value: topic.mentions }));

  return (
    <>
      <DemoKpis kpis={data.kpis} />
      <DemoGrid>
        <DemoPanel
          title={
            data.brands
              ? "Lượt đề cập theo khu vực"
              : "Lượt đề cập theo ngày và cảm xúc"
          }
          span="s8"
          scope="common"
        >
          <TrendChart trend={data.trend} brands={data.brands} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
            {data.events.map((event) => (
              <span key={event.date}>
                <b className="text-foreground">{event.date}</b> · {event.label}
              </span>
            ))}
          </div>
        </DemoPanel>
        <AiPanel data={data} />
        <DemoPanel title="Phân bổ cảm xúc" span="s4" scope="common">
          <DonutChart
            data={[
              { name: "Tích cực", value: totals.pos },
              { name: "Trung lập", value: totals.neu },
              { name: "Tiêu cực", value: totals.neg },
            ]}
            colors={["var(--pos)", "var(--neu)", "var(--neg)"]}
          />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
              NSS
              <b className="mt-0.5 block text-[17px] text-foreground">
                {formatSigned(totals.nss)}
              </b>
            </div>
            <div className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
              Tiêu cực
              <b className="mt-0.5 block text-[17px] text-foreground">
                {totals.negativeShare}%
              </b>
            </div>
          </div>
        </DemoPanel>
        <DemoPanel title="Kênh thảo luận" span="s4" scope="common">
          <DemoBars rows={channels} />
        </DemoPanel>
        <DemoPanel title="Chủ đề nổi bật" span="s4" scope="common">
          <DemoBars rows={topics} />
        </DemoPanel>
        {overviewWidgets(data.id).map((widget) => (
          <DemoPanel
            key={widget.title}
            title={widget.title}
            span={widget.span}
            scope="case"
            scopeLabel={data.tab}
            note={`${widget.note ? `${widget.note} · ` : ""}Chi tiết ở trang “${data.special}”`}
          >
            {widget.body}
          </DemoPanel>
        ))}
      </DemoGrid>
      <details className="rounded-[22px] border-[1.5px] border-border bg-card px-[18px] py-3.5">
        <summary className="cursor-pointer text-sm font-semibold">
          Định nghĩa các chỉ số
        </summary>
        <div className="mt-3.5 grid gap-3.5 md:grid-cols-3">
          {GLOSSARY.map(([title, body]) => (
            <div key={title} className="text-[13px] text-muted-foreground">
              <b className="mb-0.5 block text-[13.5px] text-foreground">{title}</b>
              {body}
            </div>
          ))}
        </div>
      </details>
    </>
  );
}

function MentionsPage({ data }: { data: AquaCase }) {
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");
  const [sentiment, setSentiment] = useState<"all" | AquaSentiment>("all");
  const mentions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.mentions.filter((mention) => {
      if (channel !== "all" && mention.channel !== channel) {
        return false;
      }
      if (sentiment !== "all" && mention.sentiment !== sentiment) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [
        mention.author,
        mention.role,
        mention.channel,
        mention.time,
        mention.text,
        mention.topic,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [channel, data.mentions, query, sentiment]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm trong nội dung, tác giả, chủ đề…"
          aria-label="Tìm kiếm"
          className="h-9 min-w-[220px] flex-1"
        />
        <Select value={channel} onValueChange={(value) => setChannel(value ?? "all")}>
          <SelectTrigger aria-label="Lọc kênh" className="h-9 w-[180px]">
            <SelectValue placeholder="Tất cả kênh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kênh</SelectItem>
            {AQUA_CHANNELS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 rounded-full border-[1.5px] border-border bg-card p-1">
          {(
            [
              ["all", "Tất cả"],
              ["pos", "Tích cực"],
              ["neu", "Trung lập"],
              ["neg", "Tiêu cực"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={sentiment === value ? "default" : "ghost"}
              aria-pressed={sentiment === value}
              onClick={() => setSentiment(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">
          Hiển thị {mentions.length}/{data.mentions.length} đề cập
        </span>
      </div>
      <DemoGrid>
        <DemoPanel
          title="Đề cập mới nhất"
          span="s12"
          scope="common"
          note="Bản demo hiển thị mẫu 6–8 đề cập. Bản thật có phân trang, lọc theo tác giả, khu vực và gắn nhãn thủ công."
        >
          {mentions.length ? (
            <DemoTable
              headers={[
                { label: "Tác giả" },
                { label: "Nội dung" },
                { label: "Kênh" },
                { label: "Chủ đề" },
                { label: "Tiếp cận", numeric: true },
                { label: "Tương tác", numeric: true },
                { label: "Cảm xúc" },
              ]}
              rows={mentions.map((mention) => {
                const colorIndex = AQUA_CHANNELS.indexOf(mention.channel);
                return [
                  <span key="who">
                    {mention.author}
                    <small className="block text-muted-foreground">
                      {mention.role} · {mention.time}
                    </small>
                  </span>,
                  mention.text,
                  <span key="ch" className="inline-flex items-center gap-1.5">
                    <i
                      className="size-2 rounded-full"
                      style={{ background: AQUA_CHANNEL_COLORS[colorIndex] ?? "var(--primary)" }}
                    />
                    {mention.channel}
                  </span>,
                  mention.topic,
                  formatShort(mention.reach),
                  formatCount(mention.engagement),
                  <SentimentPill
                    key="pill"
                    sentiment={mention.sentiment}
                    label={AQUA_SENTIMENT_LABEL[mention.sentiment]}
                  />,
                ];
              })}
            />
          ) : (
            <p className="px-2 py-7 text-center text-[13px] text-muted-foreground">
              Không có đề cập khớp bộ lọc. Hãy bỏ bớt điều kiện lọc.
            </p>
          )}
        </DemoPanel>
      </DemoGrid>
    </>
  );
}

function SentimentPage({ data }: { data: AquaCase }) {
  return (
    <DemoGrid>
      <DemoPanel
        title="Chỉ số cảm xúc (NSS) theo ngày"
        span="s8"
        scope="common"
        note="Dưới 0: tiêu cực chiếm ưu thế. Trên +40: thương hiệu được nhìn nhận tốt."
      >
        <NssChart values={nssByDay(data.trend)} />
      </DemoPanel>
      <DemoPanel
        title="Cảm xúc chi tiết"
        span="s4"
        scope="common"
        note="Phân loại cảm xúc bằng AI"
      >
        <EmotionChart values={data.emos} />
      </DemoPanel>
      <DemoPanel
        title="Cảm xúc theo khía cạnh"
        span="s12"
        scope="common"
        note="Tỷ lệ tích cực (phải) và tiêu cực (trái) trong các đề cập nhắc đến từng khía cạnh"
      >
        <AspectChart aspects={data.aspects} />
      </DemoPanel>
    </DemoGrid>
  );
}

function TopicsPage({ data }: { data: AquaCase }) {
  const max = Math.max(...data.topics.map((topic) => topic.mentions), 1);
  const colors = ["#0A6CFF", "#0B2D72", "#22C5EE", "#14B8A6", "#4A6583"];
  const words = [
    ...data.topics,
    ...data.query.with.map((name, index) => ({
      name,
      mentions: max * (0.18 + 0.05 * index),
      growth: 0,
      positive: 60,
      negative: 10,
    })),
  ];
  const sorted = [...data.topics].sort((a, b) => b.mentions - a.mentions);

  return (
    <DemoGrid>
      <DemoPanel
        title="Đám mây từ khóa"
        span="s5"
        scope="common"
        note="Cỡ chữ theo số đề cập, màu đỏ: chủ đề tiêu cực chiếm đa số"
      >
        <div className="flex flex-wrap items-baseline justify-center gap-x-3.5 gap-y-1.5 px-1 py-2 leading-tight">
          {words.map((word, index) => (
            <span
              key={`${word.name}-${index}`}
              className="font-semibold"
              style={{
                fontSize: 13 + Math.round((word.mentions / max) * 22),
                color: word.negative >= 50 ? "var(--neg)" : colors[index % colors.length],
              }}
            >
              {word.name}
            </span>
          ))}
        </div>
      </DemoPanel>
      <DemoPanel
        title="Tăng trưởng chủ đề"
        span="s7"
        scope="common"
        note="So với 14 ngày trước"
      >
        <GrowthChart topics={data.topics} />
      </DemoPanel>
      <DemoPanel
        title="Danh sách chủ đề"
        span="s12"
        scope="common"
        note="Chủ đề được AI tự động gom nhóm từ nội dung đề cập"
      >
        <DemoTable
          headers={[
            { label: "Chủ đề" },
            { label: "Đề cập", numeric: true },
            { label: "Tăng trưởng", numeric: true },
            { label: "Tích cực", numeric: true },
            { label: "Tiêu cực", numeric: true },
          ]}
          rows={sorted.map((topic) => [
            topic.name,
            formatCount(topic.mentions),
            <span
              key="g"
              className={topic.growth >= 0 ? "font-semibold text-[#0B8A6B]" : "font-semibold text-[#D5402F]"}
            >
              {topic.growth >= 0 ? "▲" : "▼"} {Math.abs(topic.growth)}%
            </span>,
            `${topic.positive}%`,
            <span key="n" className={topic.negative >= 40 ? "font-semibold text-[#D5402F]" : undefined}>
              {topic.negative}%
            </span>,
          ])}
        />
      </DemoPanel>
    </DemoGrid>
  );
}

function ChannelsPage({ data }: { data: AquaCase }) {
  const heat = discussionHeat(data.id);
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <DemoGrid>
      <DemoPanel title="Tỷ trọng theo kênh" span="s5" scope="common">
        <ChannelMixChart channels={data.channels} />
      </DemoPanel>
      <DemoPanel title="Cảm xúc theo kênh" span="s7" scope="common">
        <ChannelSentimentChart rows={channelSentiment(data.id)} />
      </DemoPanel>
      <DemoPanel
        title="Thời điểm thảo luận sôi nổi nhất"
        span="s7"
        scope="common"
        note="Số đề cập theo giờ trong ngày và thứ trong tuần. Dùng để chọn giờ đăng bài, giờ trực CSKH."
      >
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[560px] gap-[3px] text-[10.5px] text-muted-foreground"
            style={{ gridTemplateColumns: "34px repeat(24, minmax(18px, 1fr))" }}
          >
            <div />
            {hours.map((hour) => (
              <div key={hour} className="text-center">
                {hour % 3 === 0 ? `${hour}h` : ""}
              </div>
            ))}
            {heat.map((row) => (
              <div key={row[0]?.day} className="contents">
                <div className="flex items-center">{row[0]?.day}</div>
                {row.map((cell) => (
                  <div
                    key={`${cell.day}-${cell.hour}`}
                    title={`${cell.day} ${cell.hour}h: ${cell.count} đề cập`}
                    className="h-[22px] rounded"
                    style={{ background: `rgba(0,145,255,${cell.alpha.toFixed(2)})` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          Ít
          {[0.08, 0.35, 0.65, 1].map((alpha) => (
            <i
              key={alpha}
              className="inline-block h-3 w-4 rounded-sm"
              style={{ background: `rgba(0,145,255,${alpha})` }}
            />
          ))}
          Nhiều
        </div>
      </DemoPanel>
      <DemoPanel title="Nguồn có ảnh hưởng nhất" span="s5" scope="common">
        <DemoTable
          headers={[
            { label: "Nguồn" },
            { label: "Loại" },
            { label: "Bài", numeric: true },
            { label: "Tiếp cận", numeric: true },
          ]}
          rows={AQUA_SOURCES.map((source) => [
            source.name,
            source.type,
            formatCount(source.posts),
            source.reach,
          ])}
        />
      </DemoPanel>
    </DemoGrid>
  );
}

function AuthorsPage() {
  return (
    <DemoGrid>
      <DemoPanel
        title="Tác giả có ảnh hưởng nhất"
        span="s8"
        scope="common"
        note="Xếp theo tổng tương tác trên các bài có nhắc đến thương hiệu"
      >
        <DemoTable
          headers={[
            { label: "Tác giả" },
            { label: "Nền tảng" },
            { label: "Phân loại" },
            { label: "Người theo dõi", numeric: true },
            { label: "Bài đề cập", numeric: true },
            { label: "Tương tác", numeric: true },
            { label: "Thái độ chính" },
          ]}
          rows={AQUA_AUTHORS.map((author) => [
            author.name,
            author.platform,
            author.tier,
            author.followers,
            String(author.posts),
            author.engagement,
            <SentimentPill
              key={author.name}
              sentiment={author.sentiment}
              label={AQUA_SENTIMENT_LABEL[author.sentiment]}
            />,
          ])}
        />
      </DemoPanel>
      <DemoPanel title="Cơ cấu tác giả" span="s4" scope="common">
        <DonutChart
          height={260}
          cutout="58%"
          data={[
            { name: "Mega KOL (>1 tr)", value: 1 },
            { name: "Macro KOL (100K–1 tr)", value: 6 },
            { name: "Micro KOL (10K–100K)", value: 24 },
            { name: "Người dùng thường", value: 58 },
            { name: "Báo chí, thương hiệu", value: 11 },
          ]}
          colors={["#0B2545", "#0091FF", "#5CC8FF", "#00C9A7", "#FFC93C"]}
        />
      </DemoPanel>
    </DemoGrid>
  );
}

function SpecialPage({ data }: { data: AquaCase }) {
  return (
    <DemoGrid>
      {caseWidgets(data.id).map((widget) => (
        <DemoPanel
          key={widget.title}
          title={widget.title}
          span={widget.span}
          scope="case"
          scopeLabel={data.tab}
          note={widget.note}
        >
          {widget.body}
        </DemoPanel>
      ))}
    </DemoGrid>
  );
}

function AlertsPage({ data }: { data: AquaCase }) {
  return (
    <DemoGrid>
      <DemoPanel title="Cảnh báo gần đây" span="s7" scope="common">
        <div>
          {data.alerts.map((alert) => (
            <div
              key={alert.title}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-border py-3.5 last:border-0"
            >
              <SentimentPill sentiment={alert.level} label={AQUA_ALERT_LABEL[alert.level]} />
              <div>
                <h4 className="text-sm font-semibold">{alert.title}</h4>
                <p className="text-[13px] text-muted-foreground">{alert.body}</p>
              </div>
              <div className="text-right">
                <time className="text-xs whitespace-nowrap text-muted-foreground">{alert.time}</time>
                <div className="mt-1 text-xs text-muted-foreground">{alert.status}</div>
              </div>
            </div>
          ))}
        </div>
      </DemoPanel>
      <DemoPanel
        title="Quy tắc cảnh báo đang bật"
        span="s5"
        scope="common"
        note="Bản thật cho phép tự tạo quy tắc theo từ khóa, kênh, cảm xúc"
      >
        <DemoTable
          headers={[{ label: "Quy tắc" }, { label: "Ngưỡng" }, { label: "Gửi đến" }]}
          rows={AQUA_ALERT_RULES[data.id]}
        />
      </DemoPanel>
    </DemoGrid>
  );
}

function ReportPage({
  projectName,
  data,
}: {
  projectName: string;
  data: AquaCase;
}) {
  return (
    <DemoGrid>
      <DemoPanel
        title="Báo cáo tự động"
        span="s12"
        scope="common"
        note="Cấu trúc báo cáo giống nhau ở mọi case, nội dung do AI viết theo dữ liệu của từng case"
      >
        <article className="max-w-[820px]">
          <h2 className="font-heading text-xl font-bold">{projectName}</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Kỳ báo cáo 18/9 – 01/10/2026 · Tạo tự động bởi BNB Listening AI · Đã kiểm tra bởi: (chưa duyệt)
          </p>
          <h3 className="mt-5 mb-2 text-[15px] font-bold">Tóm tắt điều hành</h3>
          <p className="text-sm leading-relaxed">{data.report.sum}</p>
          <h3 className="mt-5 mb-2 text-[15px] font-bold">Số liệu chính</h3>
          <DemoTable
            headers={[{ label: "Chỉ số" }, { label: "Giá trị", numeric: true }, { label: "Biến động", numeric: true }]}
            rows={data.kpis.map((kpi) => [
              kpi.label,
              <b key="v">{kpi.value}</b>,
              <span key="d" className={kpi.good ? "font-semibold text-[#0B8A6B]" : "font-semibold text-[#D5402F]"}>
                {kpi.delta}
              </span>,
            ])}
          />
          <h3 className="mt-5 mb-2 text-[15px] font-bold">Điểm nổi bật</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {data.ai.map((item) => (
              <li key={item.headline}>
                <b>{item.headline}</b> {item.body}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 mb-2 text-[15px] font-bold">Rủi ro cần lưu ý</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {data.report.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
          <h3 className="mt-5 mb-2 text-[15px] font-bold">Khuyến nghị hành động</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {data.report.recs.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </article>
      </DemoPanel>
    </DemoGrid>
  );
}

export function AquaDemoDashboard({
  projectName,
  projectDescription,
  projectCase,
  section = "overview",
  settingsHref,
}: AquaDemoDashboardProps) {
  const { t } = useT("dashboard");
  const data = getAquaCase(projectCase);
  const profile = data ? getAquaProfile(data.id) : null;
  const officialName = profile?.sections
    .find((item) => item.title === "Thông tin chung")
    ?.rows.find((row) => row.label === "Tên dự án");
  const isOfficial =
    officialName?.value.type === "text" && officialName.value.text === projectName;
  const caseLabel = data?.tab ?? t(`cases.${projectCase}`);
  const title =
    section === "case" ? (data?.special ?? t("nav.caseSpecial")) : AQUA_PAGE_META[section].title;
  const subtitle =
    section === "case"
      ? `Trang chỉ có ở kiểu case “${caseLabel}”`
      : AQUA_PAGE_META[section].subtitle;

  return (
    <DemoPage
      title={title}
      subtitle={subtitle}
      banner={
        <DemoBanner
          icon={data?.icon ?? PROJECT_CASE_ICONS[projectCase]}
          name={projectName}
          caseLabel={caseLabel}
          description={projectDescription || data?.desc || ""}
          datasets={profile?.datasets ?? []}
          modeLabel={profile?.modeLabel ?? "Liên tục"}
          owner={profile?.owner ?? "—"}
          showSampleFlag={Boolean(data) && !isOfficial}
          settingsHref={settingsHref}
        />
      }
    >
      {data ? (
        section === "overview" ? (
          <OverviewPage data={data} />
        ) : section === "mentions" ? (
          <MentionsPage data={data} />
        ) : section === "sentiment" ? (
          <SentimentPage data={data} />
        ) : section === "topics" ? (
          <TopicsPage data={data} />
        ) : section === "channels" ? (
          <ChannelsPage data={data} />
        ) : section === "authors" ? (
          <AuthorsPage />
        ) : section === "case" ? (
          <SpecialPage data={data} />
        ) : section === "alerts" ? (
          <AlertsPage data={data} />
        ) : (
          <ReportPage projectName={projectName} data={data} />
        )
      ) : (
        <DemoPanel title="Dashboard đang được bổ sung" span="s12" scope="case" scopeLabel={projectCase}>
          <p className="text-sm text-muted-foreground">
            Kiểu case này nằm trong danh sách sắp có của bản demo. Năm dự án Phát Đạt · La Pura đã có đủ số liệu minh họa.
          </p>
        </DemoPanel>
      )}
    </DemoPage>
  );
}
