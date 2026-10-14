/** Deterministic PRNG (mulberry32). Returns a function giving floats in [0, 1). */
export type SeededRandom = () => number;

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random: SeededRandom, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function pickOne<T>(random: SeededRandom, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** Picks a key by relative weight. Weights need not sum to 1. */
export function pickWeighted<T>(
  random: SeededRandom,
  entries: readonly { value: T; weight: number }[],
): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random() * total;

  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.value;
  }

  return entries[entries.length - 1].value;
}
