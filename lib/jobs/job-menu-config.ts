import { GlobeIcon, Share2Icon, type LucideIcon } from "lucide-react";

import type { SchedulableJobType } from "./constants";

export type JobMenuKey = "facebook-page" | "website";

export type JobMenuConfig = {
  key: JobMenuKey;
  segment: string;
  label: string;
  icon: LucideIcon;
  jobType: SchedulableJobType;
  listTitle: string;
  listDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  createLabel: string;
  formCreateTitle: string;
  formCreateDescription: string;
  formEditDescription: string;
};

export const JOB_MENU_CONFIGS = {
  "facebook-page": {
    key: "facebook-page",
    segment: "facebook-page",
    label: "Facebook page",
    icon: Share2Icon,
    jobType: "scrape-facebook",
    listTitle: "Facebook page",
    listDescription: "Scheduled scrapes for Facebook pages in this workspace.",
    emptyTitle: "No Facebook page jobs yet",
    emptyDescription: "Create a job to scrape a Facebook page on a schedule.",
    createLabel: "Create job",
    formCreateTitle: "Create Facebook page job",
    formCreateDescription:
      "Schedule a recurring scrape for a Facebook page. Syncs to QStash when enabled.",
    formEditDescription:
      "Update the Facebook page scrape job and resync its QStash schedule.",
  },
  website: {
    key: "website",
    segment: "website",
    label: "Website",
    icon: GlobeIcon,
    jobType: "scrape-website",
    listTitle: "Website",
    listDescription: "Scheduled scrapes for websites in this workspace.",
    emptyTitle: "No website jobs yet",
    emptyDescription: "Create a job to scrape a website on a schedule.",
    createLabel: "Create job",
    formCreateTitle: "Create website job",
    formCreateDescription:
      "Schedule a recurring scrape for a website. Syncs to QStash when enabled.",
    formEditDescription:
      "Update the website scrape job and resync its QStash schedule.",
  },
} as const satisfies Record<JobMenuKey, JobMenuConfig>;

export const JOB_MENU_NAV_ITEMS = Object.values(JOB_MENU_CONFIGS).map(
  ({ label, segment, icon }) => ({
    label,
    segment,
    icon,
  }),
);

export function getJobMenuConfig(key: JobMenuKey): JobMenuConfig {
  return JOB_MENU_CONFIGS[key];
}

export function getJobMenuConfigBySegment(
  segment: string,
): JobMenuConfig | null {
  return (
    Object.values(JOB_MENU_CONFIGS).find((config) => config.segment === segment) ??
    null
  );
}

export function getJobMenuConfigByJobType(
  jobType: SchedulableJobType,
): JobMenuConfig | null {
  return (
    Object.values(JOB_MENU_CONFIGS).find((config) => config.jobType === jobType) ??
    null
  );
}

export function getJobMenuHref(
  workspaceIndex: number,
  menu: JobMenuConfig,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${menu.segment}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}
