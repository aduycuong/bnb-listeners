import type { DataSourceGroupListItem } from "@/lib/data-source-groups/types";

export function summarizeDataSourceGroupFilter(
  dataSourceGroupId: string | null,
  groups: DataSourceGroupListItem[],
): string {
  if (!dataSourceGroupId) {
    return "All groups";
  }

  const group = groups.find((item) => item.id === dataSourceGroupId);
  return group?.name ?? "Selected group";
}
