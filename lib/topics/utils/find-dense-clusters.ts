/**
 * Greedy density clustering on a similarity graph: the node with the most
 * free neighbours seeds a cluster of itself and those neighbours, until no
 * seed can gather `minSize` nodes. Every member is a neighbour of its seed,
 * and clusters come out largest first.
 */
export function findDenseClusters(params: {
  ids: string[];
  edges: { a: string; b: string }[];
  minSize: number;
  maxClusters: number;
}): { seed: string; members: string[] }[] {
  const neighbours = new Map<string, Set<string>>(params.ids.map((id) => [id, new Set()]));
  for (const edge of params.edges) {
    neighbours.get(edge.a)?.add(edge.b);
    neighbours.get(edge.b)?.add(edge.a);
  }

  const taken = new Set<string>();
  const freeNeighbours = (id: string) => [...neighbours.get(id)!].filter((other) => !taken.has(other));
  const clusters: { seed: string; members: string[] }[] = [];

  while (clusters.length < params.maxClusters) {
    let seed: string | null = null;
    let best: string[] = [];
    for (const id of params.ids) {
      if (taken.has(id)) continue;
      const free = freeNeighbours(id);
      if (free.length > best.length) {
        seed = id;
        best = free;
      }
    }
    if (!seed || best.length + 1 < params.minSize) break;
    const members = [seed, ...best];
    for (const id of members) taken.add(id);
    clusters.push({ seed, members });
  }

  return clusters;
}
