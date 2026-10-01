"use client";

import type { ReactNode } from "react";

import {
  BrandSentimentChart,
  DonutChart,
  GaugeChart,
  HealthLineChart,
  PhaseChart,
  RadarAttributeChart,
  VelocityChart,
} from "@/components/projects/demo/demo-charts";
import { DemoBars, type DemoSpan } from "@/components/projects/demo/demo-ui";
import {
  AQUA_BRAND_COLORS,
  AQUA_BRAND_NAMES,
  CAMPAIGN_PROGRESS,
  crisisVelocity,
  formatCount,
  formatShort,
  type AquaCaseId,
} from "@/lib/projects/aqua-demo";

export type DemoWidget = {
  title: string;
  span: DemoSpan;
  note?: string;
  body: ReactNode;
};

const UGC = [
  ["Clip “Đổi 10 vỏ lấy 1 chậu cây”", "Linh Trần · TikTok", "28.400 tương tác"],
  ["Vlog 1 ngày đi đổi vỏ chai", "Duy Anh Vlog · YouTube", "4.300 tương tác"],
  ["Album check-in điểm đổi Q.7", "Hà Phương · Instagram", "860 tương tác"],
  ["Gom vỏ chai cả tháng", "Mai Anh · TikTok", "520 tương tác"],
];

const TIMELINE = [
  ["red", "29/9 · 21:40", "Bài gốc phản ánh hở nắp trên Facebook (410K tiếp cận)"],
  ["red", "30/9 · 06:10", "BNB Listening phát cảnh báo cấp 2 khi bài gốc vượt 500 lượt chia sẻ"],
  ["", "30/9 · 08:25", "Aqua đăng thông báo chính thức (2 giờ 15 phút sau cảnh báo)"],
  ["red", "30/9 · 10:30", "Báo điện tử đầu tiên đưa tin, 4 trang đăng lại"],
  ["green", "01/10 · hiện tại", "Tốc độ lan truyền giảm 60% so với đỉnh"],
] as const;

const RESPONSE = [
  ["done", "✓", "Thông báo chính thức trên fanpage", "30/9 08:25 · 690K tiếp cận"],
  ["done", "✓", "Kịch bản trả lời cho CSKH và điểm bán", "30/9 11:00"],
  ["doing", "…", "Công bố kết quả kiểm nghiệm lô 0925", "Dự kiến 02/10"],
  ["doing", "…", "Trả lời các bài hỏi về sức khỏe trên diễn đàn", "46/120 bài đã trả lời"],
  ["todo", "", "Mời chuyên gia độc lập lên tiếng", "Chưa bắt đầu"],
] as const;

const COMPARE_ROWS = [
  ["Aqua", "48.216", "34%", "+56", "1,42 tr", "Bao bì chai mới"],
  ["Breeze", "38.290", "27%", "+38", "1,61 tr", "1 tặng 1"],
  ["Nami", "32.620", "23%", "+47", "0,88 tr", "Nước điện giải"],
  ["Coolo", "22.690", "16%", "+22", "0,41 tr", "Nắp khó mở"],
];

const JOURNEY = [
  ["Tìm hiểu", 1840, 8],
  ["Mua hàng (app, web)", 2310, 24],
  ["Giao hàng", 3620, 41],
  ["Sử dụng sản phẩm", 4280, 9],
  ["Hậu mãi, CSKH", 810, 46],
] as const;

const PRIORITY = [
  ["Giao hàng chậm (Hà Nội)", "412", 38, "Vận hành", "Đang xử lý"],
  ["Lỗi thanh toán ví điện tử", "186", 64, "Kỹ thuật", "Đang xử lý"],
  ["Chai móp, hở nắp", "154", -12, "Chất lượng", "Đang theo dõi"],
  ["Hotline khó liên hệ", "138", 9, "CSKH", "Mới"],
  ["Hết hàng tại cửa hàng", "96", 21, "Kinh doanh", "Mới"],
] as const;

function MiniStats({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
          {item.label}
          <b className="mt-0.5 block text-[17px] text-foreground">{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function ProgressRows() {
  return (
    <div className="flex flex-col gap-3.5">
      {CAMPAIGN_PROGRESS.map((row) => {
        const percent = Math.round((row.actual / row.target) * 100);
        return (
          <div key={row.label} className="text-[13px]">
            <div className="mb-1 flex justify-between gap-3">
              <span>{row.label}</span>
              <b className="font-semibold">
                {formatShort(row.actual)} / {formatShort(row.target)} · {percent}%
              </b>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <i
                className="block h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, percent)}%`,
                  opacity: percent < 80 ? 0.55 : 1,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function caseWidgets(caseId: AquaCaseId): DemoWidget[] {
  if (caseId === "general") {
    return [
      {
        title: "Chỉ số sức khỏe thương hiệu",
        span: "s4",
        note: "Tổng hợp từ 4 thành phần, thang 0–100",
        body: (
          <>
            <GaugeChart />
            <MiniStats
              items={[
                { label: "Mức độ thảo luận", value: "78" },
                { label: "Cảm xúc", value: "81" },
                { label: "Lan tỏa", value: "69" },
                { label: "Tương tác", value: "66" },
              ]}
            />
          </>
        ),
      },
      {
        title: "Thuộc tính gắn với thương hiệu",
        span: "s4",
        note: "Tỷ lệ đề cập nhắc đến từng thuộc tính",
        body: (
          <DemoBars
            rows={[
              ["Tươi mát", 38],
              ["Giá hợp lý", 29],
              ["Tiện lợi", 24],
              ["Chất lượng ổn định", 21],
              ["Thân thiện môi trường", 12],
            ].map(([label, value]) => ({
              label: String(label),
              value: Number(value),
              display: `${value}%`,
            }))}
          />
        ),
      },
      {
        title: "Share of Voice trong ngành",
        span: "s4",
        body: (
          <DonutChart
            data={AQUA_BRAND_NAMES.map((name, index) => ({
              name,
              value: [34, 27, 23, 16][index],
            }))}
            colors={[...AQUA_BRAND_COLORS]}
          />
        ),
      },
      {
        title: "Chỉ số sức khỏe 6 tháng",
        span: "s12",
        body: <HealthLineChart />,
      },
    ];
  }

  if (caseId === "campaign") {
    return [
      {
        title: "Tiến độ so với mục tiêu KPI",
        span: "s5",
        note: "Mục tiêu lấy từ cài đặt dự án",
        body: <ProgressRows />,
      },
      {
        title: "So sánh theo giai đoạn",
        span: "s7",
        note: "Đề cập trung bình mỗi ngày và chỉ số cảm xúc",
        body: <PhaseChart />,
      },
      {
        title: "Nội dung UGC nổi bật",
        span: "s6",
        body: (
          <div>
            {UGC.map((item) => (
              <div
                key={item[0]}
                className="grid grid-cols-[1fr_auto] gap-2.5 border-b border-border py-2.5 text-[13px] last:border-0"
              >
                <span>
                  {item[0]}
                  <small className="mt-0.5 block text-muted-foreground">{item[1]}</small>
                </span>
                <b>{item[2]}</b>
              </div>
            ))}
          </div>
        ),
      },
      {
        title: "Đóng góp của KOL",
        span: "s6",
        note: "Tỷ lệ tương tác chiến dịch đến từ mỗi KOL",
        body: (
          <DemoBars
            rows={[
              ["Linh Trần", 18],
              ["Duy Anh Vlog", 9],
              ["Thùy Dương", 6],
              ["Hà Phương", 4],
              ["UGC tự nhiên", 63],
            ].map(([label, value]) => ({
              label: String(label),
              value: Number(value),
              display: `${value}%`,
            }))}
          />
        ),
      },
    ];
  }

  if (caseId === "crisis") {
    return [
      {
        title: "Mức độ & diễn biến",
        span: "s5",
        body: (
          <div>
            <div className="text-[12.5px] text-muted-foreground">
              Nghi vấn hở nắp chai lô 0925
            </div>
            <b className="text-[15px]">Cấp 2 – Đang lan rộng</b>
            <div className="mt-2 flex gap-1">
              <i className="h-2 flex-1 rounded-full bg-[#FFC53D]" />
              <i className="h-2 flex-1 rounded-full bg-[#FF9F43]" />
              <i className="h-2 flex-1 rounded-full bg-muted" />
            </div>
            <ol className="mt-4 flex flex-col gap-3.5 border-l-2 border-border pl-4">
              {TIMELINE.map((item) => (
                <li key={item[1]} className="relative text-[13px]">
                  <span
                    className="absolute top-1 -left-[23px] size-3 rounded-full border-[3px] bg-card"
                    style={{
                      borderColor:
                        item[0] === "red"
                          ? "var(--neg)"
                          : item[0] === "green"
                            ? "var(--pos)"
                            : "var(--primary)",
                    }}
                  />
                  <time className="block text-xs text-muted-foreground">{item[1]}</time>
                  {item[2]}
                </li>
              ))}
            </ol>
          </div>
        ),
      },
      {
        title: "Tốc độ lan truyền 48 giờ",
        span: "s7",
        note: "Số bài mới mỗi giờ, từ 29/9 12:00 đến 01/10 12:00",
        body: <VelocityChart points={crisisVelocity()} />,
      },
      {
        title: "Luận điểm chính trong thảo luận",
        span: "s6",
        note: "Tỷ lệ trên tổng đề cập về sự cố",
        body: (
          <DemoBars
            rows={[
              ["Sản phẩm bị lỗi", 38, "38%"],
              ["Lo ngại sức khỏe ▲", 22, "22%"],
              ["Kiểm soát chất lượng kém", 16, "16%"],
              ["Ghi nhận cách xử lý", 14, "14%"],
              ["Tẩy chay thương hiệu", 10, "10%"],
            ].map(([label, value, display]) => ({
              label: String(label),
              value: Number(value),
              display: String(display),
            }))}
          />
        ),
      },
      {
        title: "Theo dõi phản hồi",
        span: "s6",
        body: (
          <ul className="flex flex-col gap-2.5">
            {RESPONSE.map((item) => (
              <li key={item[2]} className="flex items-start gap-2.5 text-[13px]">
                <span
                  className={
                    item[0] === "done"
                      ? "grid size-5 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--pos)_18%,transparent)] text-xs font-bold text-[#0B8A6B]"
                      : item[0] === "doing"
                        ? "grid size-5 shrink-0 place-items-center rounded-md bg-[#FFF3D1] text-xs font-bold text-[#8A5B00]"
                        : "grid size-5 shrink-0 place-items-center rounded-md border border-border"
                  }
                >
                  {item[1]}
                </span>
                <span>
                  {item[2]}
                  <small className="block text-muted-foreground">{item[3]}</small>
                </span>
              </li>
            ))}
          </ul>
        ),
      },
    ];
  }

  if (caseId === "competitor") {
    return [
      {
        title: "Share of Voice",
        span: "s4",
        body: (
          <DonutChart
            data={AQUA_BRAND_NAMES.map((name, index) => ({
              name,
              value: [34, 27, 23, 16][index],
            }))}
            colors={[...AQUA_BRAND_COLORS]}
          />
        ),
      },
      {
        title: "Cảm xúc theo thương hiệu",
        span: "s8",
        body: <BrandSentimentChart />,
      },
      {
        title: "Cảm nhận theo thuộc tính",
        span: "s5",
        note: "Điểm cảm xúc ròng theo thuộc tính (0–100)",
        body: <RadarAttributeChart />,
      },
      {
        title: "Bảng so sánh",
        span: "s7",
        body: (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {["Thương hiệu", "Đề cập", "SOV", "NSS", "Tương tác", "Chủ đề nổi bật"].map(
                    (label, index) => (
                      <th
                        key={label}
                        className={index > 0 && index < 5 ? "px-2 py-2 text-right" : "px-2 py-2"}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, index) => (
                  <tr
                    key={row[0]}
                    className={index === 0 ? "font-semibold" : undefined}
                  >
                    <td className="px-2 py-2">{AQUA_BRAND_NAMES[index]}</td>
                    {row.slice(1).map((cell, cellIndex) => (
                      <td
                        key={cell}
                        className={
                          cellIndex < 4
                            ? "px-2 py-2 text-right tabular-nums"
                            : "px-2 py-2"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      },
    ];
  }

  return [
    {
      title: "Vấn đề theo hành trình khách hàng",
      span: "s12",
      note: "Số phản hồi và tỷ lệ tiêu cực ở mỗi khâu",
      body: (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
          {JOURNEY.map((stage) => (
            <div key={stage[0]} className="rounded-xl bg-muted p-3 text-[12.5px]">
              <b className="mb-1.5 block text-[13.5px]">{stage[0]}</b>
              {formatCount(stage[1])} phản hồi
              <div className="my-2 h-1.5 overflow-hidden rounded-full bg-border">
                <i
                  className="block h-full rounded-full bg-[var(--neg)]"
                  style={{ width: `${stage[2]}%` }}
                />
              </div>
              <span className={stage[2] >= 30 ? "font-semibold text-[#D5402F]" : undefined}>
                {stage[2]}% tiêu cực
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Vấn đề cần ưu tiên",
      span: "s7",
      body: (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-2">Vấn đề</th>
                <th className="px-2 py-2 text-right">Số lượt</th>
                <th className="px-2 py-2 text-right">Xu hướng</th>
                <th className="px-2 py-2">Bộ phận phụ trách</th>
                <th className="px-2 py-2">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITY.map((row) => (
                <tr key={row[0]} className="border-b border-border/70 last:border-0">
                  <td className="px-2 py-2">{row[0]}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row[1]}</td>
                  <td
                    className={
                      row[2] > 0
                        ? "px-2 py-2 text-right font-semibold text-[#D5402F]"
                        : "px-2 py-2 text-right font-semibold text-[#0B8A6B]"
                    }
                  >
                    {row[2] > 0 ? "▲" : "▼"} {Math.abs(row[2])}%
                  </td>
                  <td className="px-2 py-2">{row[3]}</td>
                  <td className="px-2 py-2">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      title: "Đề xuất sản phẩm từ khách hàng",
      span: "s5",
      body: (
        <DemoBars
          suffix=" lượt"
          rows={[
            ["Chai 350ml bỏ túi", 128],
            ["Nước điện giải", 94],
            ["Gói giao định kỳ", 71],
            ["Thêm vị trái cây", 58],
            ["Vỏ chai tái chế 100%", 35],
          ].map(([label, value]) => ({
            label: String(label),
            value: Number(value),
          }))}
        />
      ),
    },
  ];
}

export function overviewWidgets(caseId: AquaCaseId) {
  const widgets = caseWidgets(caseId);
  const picked: DemoWidget[] = [];
  let used = 0;

  for (const widget of widgets) {
    const span = Number(widget.span.slice(1));
    if (used + span > 12) {
      break;
    }
    picked.push(widget);
    used += span;
    if (used === 12) {
      break;
    }
  }

  return picked;
}
