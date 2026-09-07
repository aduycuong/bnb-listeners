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
import type { JobListItem } from "@/lib/jobs/types";
import { summarizeJobFilter } from "@/lib/documents/utils/summarize-job-filter";

type DocumentJobSourceFilterProps = {
  jobs: JobListItem[];
  jobIds: string[];
  onJobIdsChange: (jobIds: string[]) => void;
  disabled?: boolean;
};

function toggleId(selectedIds: string[], id: string) {
  return selectedIds.includes(id)
    ? selectedIds.filter((value) => value !== id)
    : [...selectedIds, id];
}

export function DocumentJobSourceFilter({
  jobs,
  jobIds,
  onJobIdsChange,
  disabled = false,
}: DocumentJobSourceFilterProps) {
  const label = summarizeJobFilter(jobIds, jobs);
  const hasFilters = jobIds.length > 0;

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
          <DropdownMenuLabel>Job</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={!hasFilters}
            onCheckedChange={() => onJobIdsChange([])}
          >
            All jobs
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {jobs.length === 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              No jobs configured yet.
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            {jobs.map((job) => (
              <DropdownMenuCheckboxItem
                key={job.id}
                checked={jobIds.includes(job.id)}
                onCheckedChange={() =>
                  onJobIdsChange(toggleId(jobIds, job.id))
                }
              >
                {job.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
