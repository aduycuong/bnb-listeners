/** `2026-10-19` → `19/10/2026`. */
function dayLabel(date: string, withYear = true) {
  const [year, month, day] = date.split("-");
  return withYear ? `${Number(day)}/${Number(month)}/${year}` : `${Number(day)}/${Number(month)}`;
}

/** Name of a report period as people say it: "Tuần 19/10 – 25/10/2026", "Tháng 10/2026". */
export function formatReportPeriod(report: {
  periodType: string;
  periodStart: string;
  periodEnd: string;
}) {
  const [year, month] = report.periodStart.split("-").map(Number);
  switch (report.periodType) {
    case "day":
      return `Ngày ${dayLabel(report.periodStart)}`;
    case "week":
      return `Tuần ${dayLabel(report.periodStart, false)} – ${dayLabel(report.periodEnd)}`;
    case "month":
      return `Tháng ${month}/${year}`;
    case "quarter":
      return `Quý ${Math.ceil(month / 3)}/${year}`;
    case "year":
      return `Năm ${year}`;
    default:
      return `${dayLabel(report.periodStart)} – ${dayLabel(report.periodEnd)}`;
  }
}
