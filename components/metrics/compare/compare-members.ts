import { meanOf } from "@/lib/metrics/formulas";

/** The primary project's color; competitors take the others in order (D30). */
export const PRIMARY_COLOR = "#0091FF";
const COMPETITOR_COLORS = ["#FFC93C", "#00C9A7", "#FF6B6B"];

export const COMPETITOR_MEAN_LABEL = "TB đối thủ";
export const COMPETITOR_MEAN_COLOR = "var(--muted-foreground)";

export type Cell = number | null;

/** What every compare helper needs of a member; pages add their own report data. */
export type CompareMemberBase = { id: string; name: string; primary: boolean; color: string };

export type ComparedMember<T> = CompareMemberBase & { reports: T };

/** Members of a compare result with their colors, the primary project first. */
export function toComparedMembers<T>(
  members: { id: string; name: string; primary: boolean; reports: T }[],
): ComparedMember<T>[] {
  let competitor = 0;
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    primary: member.primary,
    color: member.primary
      ? PRIMARY_COLOR
      : COMPETITOR_COLORS[competitor++ % COMPETITOR_COLORS.length],
    reports: member.reports,
  }));
}

/** The competitors' unweighted mean of a value; each competitor counts once. */
export function competitorMean<M extends CompareMemberBase>(members: M[], read: (member: M) => Cell) {
  return meanOf(members.filter((member) => !member.primary).map(read));
}

/**
 * Line series of each member over the same labels, the primary project wider, with the
 * competitors' mean as a dashed line when there are two competitors or more.
 */
export function compareLineSeries<M extends CompareMemberBase>(
  members: M[],
  labels: string[],
  read: (member: M, label: string) => Cell,
) {
  const series = members.map((member) => ({
    key: member.name,
    color: member.color,
    width: member.primary ? 3 : 1.5,
    values: labels.map((label) => read(member, label)),
  }));
  const competitors = members.filter((member) => !member.primary);
  if (competitors.length < 2) return series;
  return [
    ...series,
    {
      key: COMPETITOR_MEAN_LABEL,
      color: COMPETITOR_MEAN_COLOR,
      dashed: true,
      width: 2,
      values: labels.map((label) => meanOf(competitors.map((member) => read(member, label)))),
    },
  ];
}
