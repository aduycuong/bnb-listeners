"use client";

import { useState, type ReactNode } from "react";

import {
  BuyerIntentChart,
  DonutChart,
  GaugeChart,
  HealthLineChart,
  PriceBucketChart,
  PriceTrendChart,
  ProjectSentimentChart,
  RadarAttributeChart,
  VelocityChart,
} from "@/components/projects/demo/demo-charts";
import { DemoBars, SentimentPill, type DemoSpan } from "@/components/projects/demo/demo-ui";
import {
  AQUA_AREAS,
  AQUA_BRAND_COLORS,
  AQUA_BRAND_NAMES,
  AQUA_BRAND_SHARE,
  crisisVelocity,
  formatCount,
  formatSigned,
  type AquaArea,
  type AquaCaseId,
} from "@/lib/projects/aqua-demo";

export type DemoWidget = {
  title: string;
  span: DemoSpan;
  note?: string;
  body: ReactNode;
};

const FAQ = [
  ["Khi nào bàn giao tháp Zenia?", "642 lượt", "Đã có câu trả lời trên FAQ"],
  ["Thanh toán 10% rồi vay ngân hàng thế nào?", "518 lượt", "Đã có câu trả lời trên FAQ"],
  ["Giá Lusso Saigon chênh Zenia bao nhiêu?", "376 lượt", "Đã có câu trả lời trên FAQ"],
  ["Dự án có liên quan Astral City cũ không?", "254 lượt", "Chưa có câu trả lời chính thức"],
  ["Phí quản lý dự kiến bao nhiêu mỗi m²?", "198 lượt", "Chưa có câu trả lời chính thức"],
] as const;

const TIMELINE = [
  ["red", "23/9 · 20:10", "Bài đăng “Zenia lùi bàn giao sang 2027” trong group nhà đầu tư (142K tiếp cận)"],
  ["red", "24/9 · 06:00", "BNB Listening phát cảnh báo cấp 2 khi bài vượt 30 nhóm chia sẻ"],
  ["", "24/9 · 08:50", "Phát Đạt đính chính chính thức (2 giờ 50 phút sau cảnh báo)"],
  ["red", "24/9 · 09:30", "Tin đồn lan sang TikTok, 6 video, 410K lượt xem"],
  ["green", "24/9 · 15:00 → 30/9", "Công bố video tiến độ, tổ chức tham quan công trường"],
] as const;

const RESPONSE = [
  ["done", "✓", "Đính chính chính thức trên fanpage dự án", "24/9 08:50 · 380K tiếp cận"],
  ["done", "✓", "Đăng video tiến độ thi công tháp Zenia", "24/9 15:00"],
  ["done", "✓", "Tổ chức tham quan công trường cho khách hàng", "30/9 · 120 khách hàng"],
  ["doing", "…", "Công bố lịch bàn giao Zenia theo tầng", "Dự kiến 10/10"],
  ["todo", "", "Cung cấp thông tin bảo lãnh ngân hàng cho khách hàng", "Chưa bắt đầu"],
] as const;

const BROKERS = [
  ["Phú Thịnh Realty", "F2", "1.460", "41", "2,8%", "Quà tặng, chiết khấu", "Cảnh báo lần 2", "high"],
  ["Môi giới tự do", "—", "3.620", "88", "2,4%", "Suất ngoại giao, giá sai", "Theo dõi", "med"],
  ["Đất Việt Land", "F1", "2.240", "24", "1,1%", "Giá rao sai", "Đã khắc phục 85%", "on"],
  ["Kim Ngân Realty", "F2", "780", "22", "2,8%", "Giá nội bộ", "Cảnh báo lần 1", "med"],
  ["Sao Mai Land", "F2", "610", "21", "3,4%", "Cam kết cho thuê", "Đề xuất tạm khóa giỏ hàng", "high"],
  ["An Khang Property", "F1", "1.680", "18", "1,1%", "Dùng logo", "Đã khắc phục", "on"],
] as const;

const VIOLATIONS = [
  ["2 giờ", "Sao Mai Land", "Sàn F2", "Group Facebook", "Mua Lusso Saigon cam kết cho thuê 15 triệu/tháng trong 3 năm.", "Cam kết cho thuê", "high"],
  ["4 giờ", "Kim Ngân Realty", "Sàn F2", "Facebook", "Giá nội bộ La Pura thấp hơn bảng giá 5 triệu/m², số lượng có hạn.", "Giá sai bảng giá", "high"],
  ["5 giờ", "Phú Thịnh Realty", "Sàn F2", "TikTok", "Tặng 2 lượng vàng SJC + chiết khấu 12% căn La Pura.", "Quà tặng, chiết khấu sai chính sách", "med"],
  ["8 giờ", "muaban_nhanh_88", "Môi giới tự do", "Trang rao vặt", "Suất ngoại giao Zenia 2PN chỉ 1,99 tỷ, sổ hồng riêng, nhận nhà ngay.", "Giá và pháp lý sai", "med"],
  ["1 ngày", "Minh Châu Home", "Sàn F2", "Facebook", "Dùng logo Phát Đạt, tự xưng “đại lý F1 La Pura” trên trang bán hàng.", "Dùng logo trái phép", "low"],
] as const;

const FUNNEL = [
  ["Phát hiện", "386", 100],
  ["Xác nhận", "214", 55],
  ["Đã gửi cảnh báo", "196", 51],
  ["Đã khắc phục", "146", 38],
] as const;

type AreaMetric = "mentions" | "nss" | "price";

const AREA_METRICS: { id: AreaMetric; label: string }[] = [
  { id: "mentions", label: "Lượng thảo luận" },
  { id: "nss", label: "Cảm xúc (NSS)" },
  { id: "price", label: "Giá căn hộ" },
];

function metricValue(area: AquaArea, metric: AreaMetric) {
  if (metric === "nss") {
    return area.nss;
  }
  if (metric === "price") {
    return area.price;
  }
  return area.mentions;
}

function metricLabel(area: AquaArea, metric: AreaMetric) {
  if (metric === "nss") {
    return formatSigned(area.nss);
  }
  if (metric === "price") {
    return `${area.price.toFixed(1).replace(".", ",")} tr`;
  }
  return formatCount(area.mentions);
}

function AreaBoard() {
  const [metric, setMetric] = useState<AreaMetric>("mentions");
  const [selected, setSelected] = useState("Thủ Đức");
  const area = AQUA_AREAS.find((item) => item.name === selected) ?? AQUA_AREAS[0];
  const max = Math.max(...AQUA_AREAS.map((item) => metricValue(item, metric)), 1);
  const rank =
    [...AQUA_AREAS].sort((a, b) => b.mentions - a.mentions).findIndex((item) => item.name === area.name) +
    1;
  const note =
    area.growth >= 20
      ? "Khu vực đang nóng lên nhanh, nên theo dõi giá và nguồn cung mới."
      : area.nss < 10
        ? "Cảm xúc thấp, cần tìm hiểu các phàn nàn chính trước khi triển khai bán hàng."
        : "Thị trường ổn định, phù hợp truyền thông duy trì.";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.8fr)]">
      <div>
        <div className="mb-2.5 inline-flex rounded-full border border-border p-0.5">
          {AREA_METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                metric === item.id
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-full px-3 py-1 text-xs text-muted-foreground"
              }
              onClick={() => setMetric(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5" style={{ gridAutoRows: "76px" }}>
          {AQUA_AREAS.map((item) => {
            const strength = Math.max(0.16, metricValue(item, metric) / max);
            return (
              <button
                key={item.name}
                type="button"
                className="rounded-xl px-2 py-1.5 text-left text-[12px]"
                style={{
                  gridColumn: item.column,
                  gridRow: item.rowSpan > 1 ? `${item.row} / span ${item.rowSpan}` : item.row,
                  background: `color-mix(in srgb, #0091FF ${Math.round(strength * 78)}%, white)`,
                  outline: item.name === area.name ? "2px solid #0B2545" : "1px solid transparent",
                }}
                onClick={() => setSelected(item.name)}
              >
                <b className="block truncate">{item.name}</b>
                <span className="block font-semibold">{metricLabel(item, metric)}</span>
                <span className="text-[11px]">
                  {item.growth >= 0 ? "▲" : "▼"} {Math.abs(item.growth)}%
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Sơ đồ minh họa vị trí tương đối, không theo tỉ lệ. 80% thảo luận đã được gắn vị trí.
        </p>
      </div>
      <div>
        <div className="font-heading text-[22px] font-bold">{area.name}</div>
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Hạng {rank}/{AQUA_AREAS.length} về lượng thảo luận
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Thảo luận", formatCount(area.mentions)],
            ["Tăng trưởng", `${area.growth >= 0 ? "+" : ""}${area.growth}%`],
            ["NSS", formatSigned(area.nss)],
            ["Giá căn hộ", `${area.price.toFixed(1).replace(".", ",")} tr/m²`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
              {label}
              <b className="mt-0.5 block text-[17px] text-foreground">{value}</b>
            </div>
          ))}
        </div>
        <p className="mt-3.5 text-[13px] text-muted-foreground">
          Chủ đề nổi bật
          <b className="mt-0.5 block text-foreground">{area.topic}</b>
        </p>
        <p className="mt-3.5 text-[13px] leading-relaxed">{note}</p>
      </div>
    </div>
  );
}

function MiniStats({ items }: { items: { label: string; value: string }[] }) {
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

export function caseWidgets(caseId: AquaCaseId): DemoWidget[] {
  if (caseId === "general") {
    return [
      {
        title: "Chỉ số uy tín chủ đầu tư",
        span: "s4",
        note: "Tổng hợp từ 4 trụ cột, thang 0–100",
        body: (
          <>
            <GaugeChart />
            <MiniStats
              items={[
                { label: "Pháp lý minh bạch", value: "56" },
                { label: "Tiến độ cam kết", value: "64" },
                { label: "Năng lực tài chính", value: "52" },
                { label: "Chất lượng sản phẩm", value: "68" },
              ]}
            />
          </>
        ),
      },
      {
        title: "Cảm xúc theo từng dự án",
        span: "s4",
        note: "NSS của các dự án trọng điểm",
        body: <ProjectSentimentChart />,
      },
      {
        title: "Share of Voice cùng khu vực",
        span: "s4",
        body: (
          <DonutChart
            data={AQUA_BRAND_NAMES.map((name, index) => ({
              name,
              value: AQUA_BRAND_SHARE[index],
            }))}
            colors={[...AQUA_BRAND_COLORS]}
          />
        ),
      },
      {
        title: "Chỉ số uy tín 6 tháng",
        span: "s12",
        body: <HealthLineChart />,
      },
    ];
  }

  if (caseId === "campaign") {
    return [
      {
        title: "Giá rao bán lại theo tháng",
        span: "s8",
        note: "Triệu đồng/m², AI trích xuất từ tin rao, đã lọc trùng và tin bất thường",
        body: <PriceTrendChart />,
      },
      {
        title: "Phân bố giá rao",
        span: "s4",
        note: "382 tin rao trong 30 ngày",
        body: <PriceBucketChart />,
      },
      {
        title: "Câu hỏi thường gặp của người mua",
        span: "s6",
        note: "AI gom nhóm từ 3.240 câu hỏi",
        body: (
          <div>
            {FAQ.map((item) => (
              <div
                key={item[0]}
                className="grid grid-cols-[1fr_auto] gap-2.5 border-b border-border py-2.5 text-[13px] last:border-0"
              >
                <span>
                  {item[0]}
                  <small className="mt-0.5 block text-muted-foreground">{item[2]}</small>
                </span>
                <b>{item[1]}</b>
              </div>
            ))}
          </div>
        ),
      },
      {
        title: "So sánh khía cạnh với dự án cạnh tranh",
        span: "s6",
        note: "Điểm cảm xúc ròng theo khía cạnh",
        body: <RadarAttributeChart />,
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
              Kịch bản mô phỏng: tin đồn lùi bàn giao tháp Zenia
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
        note: "Số bài mới mỗi giờ, từ 23/9 18:00 đến 25/9 18:00",
        body: <VelocityChart points={crisisVelocity()} />,
      },
      {
        title: "Luận điểm chính của khách hàng",
        span: "s6",
        note: "Tỷ lệ trên tổng đề cập về sự cố",
        body: (
          <DemoBars
            rows={[
              ["Lo ngại lùi bàn giao", 36, "36%"],
              ["Ghi nhận đính chính của CĐT", 24, "24%"],
              ["Nghi ngờ năng lực tài chính", 14, "14%"],
              ["Muốn chuyển nhượng, cắt lỗ", 14, "14%"],
              ["Hỏi về bảo lãnh ngân hàng", 12, "12%"],
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
    const ranked = [...AQUA_AREAS].sort((a, b) => b.mentions - a.mentions);
    return [
      {
        title: "Bản đồ khu vực",
        span: "s12",
        note: "Thảo luận, cảm xúc và giá theo khu vực. Bấm vào ô để xem chi tiết.",
        body: <AreaBoard />,
      },
      {
        title: "Tâm lý người mua theo tuần",
        span: "s7",
        note: "Tỷ lệ bài thể hiện từng ý định",
        body: <BuyerIntentChart />,
      },
      {
        title: "Mối lo của người mua",
        span: "s5",
        note: "Tỷ lệ trên các bài thể hiện lo ngại",
        body: (
          <DemoBars
            rows={[
              ["Lãi suất vay", 22, "22%"],
              ["Pháp lý dự án", 19, "19%"],
              ["Giá quá cao", 17, "17%"],
              ["Tiến độ bàn giao", 12, "12%"],
              ["Thanh khoản bán lại", 10, "10%"],
              ["Quy hoạch, hạ tầng", 8, "8%"],
            ].map(([label, value, display]) => ({
              label: String(label),
              value: Number(value),
              display: String(display),
            }))}
          />
        ),
      },
      {
        title: "Bảng xếp hạng khu vực",
        span: "s12",
        body: (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {["Khu vực", "Thảo luận", "Tăng trưởng", "NSS", "Giá căn hộ (tr/m²)", "Chủ đề nổi bật"].map(
                    (label, index) => (
                      <th key={label} className={index > 0 && index < 5 ? "px-2 py-2 text-right" : "px-2 py-2"}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {ranked.map((area) => (
                  <tr key={area.name} className="border-b border-border/70 last:border-0">
                    <td className="px-2 py-2 font-semibold">{area.name}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCount(area.mentions)}</td>
                    <td
                      className={
                        area.growth >= 0
                          ? "px-2 py-2 text-right font-semibold text-[#0B8A6B]"
                          : "px-2 py-2 text-right font-semibold text-[#D5402F]"
                      }
                    >
                      {area.growth >= 0 ? "▲" : "▼"} {Math.abs(area.growth)}%
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatSigned(area.nss)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {area.price.toFixed(1).replace(".", ",")}
                    </td>
                    <td className="px-2 py-2">{area.topic}</td>
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
      title: "Vi phạm theo loại",
      span: "s5",
      note: "214 vi phạm đã xác nhận",
      body: (
        <>
          <DemoBars
            rows={[
              ["Chiết khấu, quà tặng sai", 86],
              ["Suất ngoại giao sai bảng giá", 48],
              ["Cam kết cho thuê, lợi nhuận", 34],
              ["Thông tin pháp lý sai", 22],
              ["Dùng logo trái phép", 16],
              ["Tự nhận đại lý chính thức", 8],
            ].map(([label, value]) => ({
              label: String(label),
              value: Number(value),
            }))}
          />
          <div className="mt-4 flex flex-col gap-3">
            {FUNNEL.map((row) => (
              <div key={row[0]} className="text-[13px]">
                <div className="mb-1 flex justify-between">
                  <span>{row[0]}</span>
                  <b>{row[1]}</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <i className="block h-full rounded-full bg-primary" style={{ width: `${row[2]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "Xếp hạng sàn",
      span: "s7",
      body: (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {["Sàn", "Cấp", "Tin quét", "Vi phạm", "Tỷ lệ", "Loại chính", "Trạng thái"].map((label, index) => (
                  <th key={label} className={index > 1 && index < 5 ? "px-2 py-2 text-right" : "px-2 py-2"}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BROKERS.map((row) => (
                <tr key={row[0]} className="border-b border-border/70 last:border-0">
                  <td className="px-2 py-2 font-semibold">{row[0]}</td>
                  <td className="px-2 py-2">{row[1]}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row[2]}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row[3]}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row[4]}</td>
                  <td className="px-2 py-2">{row[5]}</td>
                  <td className="px-2 py-2">
                    {row[7] === "on" ? (
                      <span className="text-[#0B8A6B]">{row[6]}</span>
                    ) : (
                      <SentimentPill
                        sentiment={row[7] === "high" ? "high" : "med"}
                        label={row[6]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      title: "Vi phạm cần xử lý",
      span: "s12",
      note: "Nội dung trích nguyên văn từ tin rao, quảng cáo để làm bằng chứng",
      body: (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {["Thời gian", "Sàn, tài khoản", "Kênh", "Nội dung phát hiện", "Loại vi phạm", "Mức độ"].map(
                  (label) => (
                    <th key={label} className="px-2 py-2">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {VIOLATIONS.map((row) => (
                <tr key={`${row[1]}-${row[0]}`} className="border-b border-border/70 align-top last:border-0">
                  <td className="px-2 py-2 whitespace-nowrap">{row[0]}</td>
                  <td className="px-2 py-2">
                    <b>{row[1]}</b>
                    <small className="block text-muted-foreground">{row[2]}</small>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">{row[3]}</td>
                  <td className="px-2 py-2">“{row[4]}”</td>
                  <td className="px-2 py-2">{row[5]}</td>
                  <td className="px-2 py-2">
                    <SentimentPill
                      sentiment={row[6] === "high" ? "high" : row[6] === "med" ? "med" : "low"}
                      label={row[6] === "high" ? "Cao" : row[6] === "med" ? "Trung bình" : "Thấp"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
