"use client";

import { ChevronDownIcon } from "lucide-react";
import { useMemo } from "react";

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
import {
  buildJobSourceFilterTree,
  summarizeJobSourceFilter,
} from "@/lib/documents/utils/build-job-source-filter-tree";
import type { JobListItem } from "@/lib/jobs/types";
import type { SourceGroupListItem } from "@/lib/source-groups/types";

type DocumentJobSourceFilterProps = {
  sourceGroups: SourceGroupListItem[];
  jobs: JobListItem[];
  groupIds: string[];
  jobIds: string[];
  onGroupIdsChange: (groupIds: string[]) => void;
  onJobIdsChange: (jobIds: string[]) => void;
  disabled?: boolean;
};

function toggleId(selectedIds: string[], id: string) {
  return selectedIds.includes(id)
    ? selectedIds.filter((value) => value !== id)
    : [...selectedIds, id];
}

export function DocumentJobSourceFilter({
  sourceGroups,
  jobs,
  groupIds,
  jobIds,
  onGroupIdsChange,
  onJobIdsChange,
  disabled = false,
}: DocumentJobSourceFilterProps) {
  const tree = useMemo(
    () => buildJobSourceFilterTree(sourceGroups, jobs),
    [jobs, sourceGroups],
  );
  const label = summarizeJobSourceFilter(groupIds, jobIds, tree);
  const hasFilters = groupIds.length > 0 || jobIds.length > 0;

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
          <DropdownMenuLabel>Source group & job</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={!hasFilters}
            onCheckedChange={() => {
              onGroupIdsChange([]);
              onJobIdsChange([]);
            }}
          >
            All sources & jobs
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {tree.length === 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              No jobs configured yet.
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : (
          tree.map((group) => (
            <DropdownMenuGroup key={group.id}>
              <DropdownMenuCheckboxItem
                checked={groupIds.includes(group.id)}
                onCheckedChange={() =>
                  onGroupIdsChange(toggleId(groupIds, group.id))
                }
              >
                {group.name}
              </DropdownMenuCheckboxItem>

              {group.jobs.map((job) => (
                <DropdownMenuCheckboxItem
                  key={job.id}
                  checked={jobIds.includes(job.id)}
                  className="pl-7"
                  onCheckedChange={() =>
                    onJobIdsChange(toggleId(jobIds, job.id))
                  }
                >
                  {job.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
