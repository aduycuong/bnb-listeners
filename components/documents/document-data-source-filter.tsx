"use client";

import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataSourceListItem } from "@/lib/data-sources/types";
import { summarizeDataSourceFilter } from "@/lib/documents/utils/summarize-data-source-filter";

type DocumentDataSourceFilterProps = {
  dataSources: DataSourceListItem[];
  dataSourceIds: string[];
  onDataSourceIdsChange: (dataSourceIds: string[]) => void;
  disabled?: boolean;
};

function toggleId(selectedIds: string[], id: string) {
  return selectedIds.includes(id)
    ? selectedIds.filter((value) => value !== id)
    : [...selectedIds, id];
}

export function DocumentDataSourceFilter({
  dataSources,
  dataSourceIds,
  onDataSourceIdsChange,
  disabled = false,
}: DocumentDataSourceFilterProps) {
  const label = summarizeDataSourceFilter(dataSourceIds, dataSources);
  const hasFilters = dataSourceIds.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          />
        }
      >
        {label}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Data source</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={!hasFilters}
            onCheckedChange={() => onDataSourceIdsChange([])}
          >
            All data sources
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {dataSources.length === 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              No data sources configured yet.
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            {dataSources.map((dataSource) => (
              <DropdownMenuCheckboxItem
                key={dataSource.id}
                checked={dataSourceIds.includes(dataSource.id)}
                onCheckedChange={() =>
                  onDataSourceIdsChange(
                    toggleId(dataSourceIds, dataSource.id),
                  )
                }
              >
                {dataSource.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
