import type { JobListItem } from "@/lib/jobs/types";

export function summarizeJobFilter(
  jobIds: string[],
  jobs: JobListItem[],
): string {
  if (jobIds.length === 0) {
    return "All jobs";
  }

  const labels = jobIds
    .map((jobId) => jobs.find((job) => job.id === jobId)?.name)
    .filter((name): name is string => Boolean(name));

  if (labels.length === 0) {
    return "Filtered";
  }

  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.length} jobs`;
}
