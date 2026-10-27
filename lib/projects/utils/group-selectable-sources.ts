import type { SelectableSource } from "../types";

export type SelectableSourceGroup = {
  key: string;
  label: string;
  sources: SelectableSource[];
};

/** Known channels in the order the source picker lists them. */
const KNOWN_GROUPS: { platform: string; sourceType: string; label: string }[] = [
  { platform: "facebook", sourceType: "group", label: "Group Facebook" },
  { platform: "facebook", sourceType: "page", label: "Page Facebook" },
  { platform: "tiktok", sourceType: "channel", label: "Kênh TikTok" },
  { platform: "tiktok", sourceType: "search", label: "Tìm kiếm TikTok" },
];

/**
 * Sources of the project source picker grouped by platform and source type: known channels first
 * in a fixed order, then the others by key. Sources of a group go by post count, most first.
 */
export function groupSelectableSources(sources: SelectableSource[]): SelectableSourceGroup[] {
  const byKey = new Map<string, SelectableSourceGroup>();
  for (const source of sources) {
    const key = `${source.platform}:${source.sourceType}`;
    let group = byKey.get(key);
    if (!group) {
      const known = KNOWN_GROUPS.find(
        (item) => item.platform === source.platform && item.sourceType === source.sourceType,
      );
      group = { key, label: known?.label ?? `${source.platform} · ${source.sourceType}`, sources: [] };
      byKey.set(key, group);
    }
    group.sources.push(source);
  }

  const rank = (key: string) => {
    const index = KNOWN_GROUPS.findIndex((item) => `${item.platform}:${item.sourceType}` === key);
    return index === -1 ? KNOWN_GROUPS.length : index;
  };
  const groups = [...byKey.values()].sort(
    (a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key),
  );
  for (const group of groups) group.sources.sort((a, b) => b.postCount - a.postCount);
  return groups;
}
