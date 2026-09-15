"use client";

import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataSourceGroupListItem } from "@/lib/data-source-groups/types";
import { summarizeDataSourceGroupFilter } from "@/lib/documents/utils/summarize-data-source-group-filter";

type DocumentDataSourceGroupFilterProps = {
  groups: DataSourceGroupListItem[];
  dataSourceGroupId: string | null;
  onDataSourceGroupIdChange: (dataSourceGroupId: string | null) => void;
  disabled?: boolean;
};

export function DocumentDataSourceGroupFilter({
  groups,
  dataSourceGroupId,
  onDataSourceGroupIdChange,
  disabled = false,
}: DocumentDataSourceGroupFilterProps) {
  const label = summarizeDataSourceGroupFilter(dataSourceGroupId, groups);
  const value = dataSourceGroupId ?? "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between sm:w-auto sm:min-w-52"
            disabled={disabled}
          />
        }
      >
        {label}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Data source group</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(nextValue) =>
              onDataSourceGroupIdChange(
                nextValue === "all" ? null : nextValue,
              )
            }
          >
            <DropdownMenuRadioItem value="all">
              All groups
            </DropdownMenuRadioItem>
            {groups.length === 0 ? (
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                No groups configured yet.
              </DropdownMenuLabel>
            ) : (
              groups.map((group) => (
                <DropdownMenuRadioItem key={group.id} value={group.id}>
                  {group.name}
                </DropdownMenuRadioItem>
              ))
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
