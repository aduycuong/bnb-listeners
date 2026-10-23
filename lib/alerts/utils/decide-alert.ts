import { growthPercent, sharePercent } from "@/lib/metrics/formulas";

/** Growth rules stay quiet when the previous window is empty or the current one is below `minMentions`. */
export function growthFires(input: {
  current: number;
  previous: number;
  threshold: number;
  minMentions: number | null;
}) {
  const growth = growthPercent(input.current, input.previous);
  if (input.minMentions != null && input.current < input.minMentions) {
    return { fires: false, growth };
  }
  return { fires: growth != null && growth >= input.threshold, growth };
}

/** Share rules use the classified count as the minimum, not every mention. */
export function shareFires(input: {
  part: number;
  total: number;
  threshold: number;
  minMentions: number | null;
}) {
  const share = sharePercent(input.part, input.total);
  if (input.minMentions != null && input.total < input.minMentions) {
    return { fires: false, share };
  }
  return { fires: share != null && share >= input.threshold, share };
}

export function countFires(count: number, threshold: number) {
  return count >= threshold;
}

/** Absolute percent distance from the reference price, one decimal. */
export function deviationPercent(amount: number, reference: number) {
  if (!Number.isFinite(amount) || !Number.isFinite(reference) || reference <= 0) return null;
  return Math.round((Math.abs(amount - reference) / reference) * 1000) / 10;
}

export function deviationFires(amount: number, reference: number, threshold: number) {
  const deviation = deviationPercent(amount, reference);
  return { fires: deviation != null && deviation >= threshold, deviation };
}
