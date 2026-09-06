import type { SourceGroupListItem } from "./types";

export function buildSourceGroupSelectItems(
  sourceGroups: SourceGroupListItem[],
): Array<{ value: string; label: string }> {
  return sourceGroups.map((group) => ({
    value: group.id,
    label: group.name,
  }));
}

export function findNoGroupSourceGroup(
  sourceGroups: SourceGroupListItem[],
): SourceGroupListItem | undefined {
  return sourceGroups.find((group) => group.isNoGroup);
}

export function resolveSourceGroupFormValue(
  groupId: string | null | undefined,
  sourceGroups: SourceGroupListItem[],
): string {
  if (groupId && sourceGroups.some((group) => group.id === groupId)) {
    return groupId;
  }

  const noGroup = findNoGroupSourceGroup(sourceGroups);
  if (noGroup) {
    return noGroup.id;
  }

  if (groupId) {
    return groupId;
  }

  return sourceGroups[0]?.id ?? "";
}
