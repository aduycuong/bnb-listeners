import { SYNTHETIC_CONFIG } from "../config";
import type { SeededRandom } from "./create-seeded-random";

const VIETNAM_UTC_OFFSET_HOURS = 7;
const MINUTE_MS = 60 * 1000;
const MAX_TRIES = 50;

/**
 * A random instant in [from, to], accepted in proportion to the posting weight
 * of its Vietnam-time hour, so posts cluster in daytime and evening.
 */
export function samplePublishedAt(
  random: SeededRandom,
  from: Date,
  to: Date,
): Date {
  const { hourWeights } = SYNTHETIC_CONFIG.plan;
  const maxWeight = Math.max(...hourWeights);
  const span = to.getTime() - from.getTime();

  let candidate = from;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    candidate = new Date(from.getTime() + random() * span);
    const hour = (candidate.getUTCHours() + VIETNAM_UTC_OFFSET_HOURS) % 24;
    if (random() < hourWeights[hour] / maxWeight) return candidate;
  }

  return candidate;
}

/** `after` plus an exponential delay with the given mean, clamped to `limit`. */
export function sampleDelayedAt(
  random: SeededRandom,
  after: Date,
  meanMinutes: number,
  limit: Date,
): Date {
  const delayMinutes = -Math.log(1 - random()) * meanMinutes;
  const at = after.getTime() + delayMinutes * MINUTE_MS;
  return new Date(Math.min(at, limit.getTime()));
}
