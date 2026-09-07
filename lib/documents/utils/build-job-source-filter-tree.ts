import type { JobListItem } from "@/lib/jobs/types";
import { findNoGroupSourceGroup } from "@/lib/source-groups/source-group-select-config";
import type { SourceGroupListItem } from "@/lib/source-groups/types";

export type JobSourceFilterTreeGroup = {
  id: string;
  name: string;
  jobs: Array<{ id: string; name: string }>;
};

export function buildJobSourceFilterTree(
  sourceGroups: SourceGroupListItem[],
  jobs: JobListItem[],
): JobSourceFilterTreeGroup[] {
  const noGroup = findNoGroupSourceGroup(sourceGroups);
  const jobsByGroupId = new Map<string, JobListItem[]>();

  for (const job of jobs) {
    const groupId = job.groupId ?? noGroup?.id;
    if (!groupId) {
      continue;
    }

    const existing = jobsByGroupId.get(groupId) ?? [];
    existing.push(job);
    jobsByGroupId.set(groupId, existing);
  }

  const groupsWithJobs = sourceGroups
    .filter((group) => (jobsByGroupId.get(group.id)?.length ?? 0) > 0)
    .map((group) => ({
      id: group.id,
      name: group.name,
      jobs: (jobsByGroupId.get(group.id) ?? [])
        .map((job) => ({ id: job.id, name: job.name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    }));

  return groupsWithJobs.sort((left, right) => left.name.localeCompare(right.name));
}

export function summarizeJobSourceFilter(
  groupIds: string[],
  jobIds: string[],
  tree: JobSourceFilterTreeGroup[],
): string {
  if (groupIds.length === 0 && jobIds.length === 0) {
    return "All sources & jobs";
  }

  const labels: string[] = [];

  for (const groupId of groupIds) {
    const group = tree.find((item) => item.id === groupId);
    if (group) {
      labels.push(group.name);
    }
  }

  for (const jobId of jobIds) {
    for (const group of tree) {
      const job = group.jobs.find((item) => item.id === jobId);
      if (job) {
        labels.push(job.name);
        break;
      }
    }
  }

  if (labels.length === 0) {
    return "Filtered";
  }

  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.length} filters`;
}
