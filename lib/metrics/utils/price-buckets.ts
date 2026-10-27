/** Up to about five buckets of round width over the amounts; empty buckets are left out. */
export function priceBuckets(amounts: number[]) {
  if (!amounts.length) return [];
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) {
    return [{ label: formatBucketEdge(min), count: amounts.length }];
  }
  const step = niceStep((max - min) / 5);
  const start = Math.floor(min / step) * step;
  const edges: number[] = [start];
  while (edges[edges.length - 1] < max) {
    edges.push(Math.round((edges[edges.length - 1] + step) * 10) / 10);
    if (edges.length > 8) break;
  }
  const buckets: { label: string; count: number }[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const from = edges[i];
    const to = edges[i + 1];
    const last = i === edges.length - 2;
    const count = amounts.filter((amount) =>
      last ? amount >= from && amount <= to : amount >= from && amount < to,
    ).length;
    const label =
      i === 0
        ? `< ${formatBucketEdge(to)}`
        : last
          ? `> ${formatBucketEdge(from)}`
          : `${formatBucketEdge(from)}–${formatBucketEdge(to)}`;
    buckets.push({ label, count });
  }
  return buckets.filter((bucket) => bucket.count > 0);
}

function formatBucketEdge(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const frac = raw / 10 ** exp;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}
