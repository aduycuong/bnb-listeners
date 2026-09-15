import type { DataSourceListItem } from "@/lib/data-sources/types";

export function summarizeDataSourceFilter(
  dataSourceIds: string[],
  dataSources: DataSourceListItem[],
): string {
  if (dataSourceIds.length === 0) {
    return "All data sources";
  }

  const labels = dataSourceIds
    .map(
      (dataSourceId) =>
        dataSources.find((dataSource) => dataSource.id === dataSourceId)?.name,
    )
    .filter((name): name is string => Boolean(name));

  if (labels.length === 0) {
    return "Filtered";
  }

  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.length} data sources`;
}
