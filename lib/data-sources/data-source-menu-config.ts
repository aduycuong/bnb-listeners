import { GlobeIcon, Share2Icon, type LucideIcon } from "lucide-react";

import type { SourceType } from "./constants";

export type DataSourceMenuKey = "facebook-page" | "website";

export type DataSourceMenuConfig = {
  key: DataSourceMenuKey;
  segment: string;
  label: string;
  icon: LucideIcon;
  sourceType: SourceType;
  listTitle: string;
  listDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  createLabel: string;
  formCreateTitle: string;
  formCreateDescription: string;
  formEditDescription: string;
};

export const DATA_SOURCE_MENU_CONFIGS = {
  "facebook-page": {
    key: "facebook-page",
    segment: "facebook-page",
    label: "Facebook page",
    icon: Share2Icon,
    sourceType: "scrape-facebook",
    listTitle: "Facebook page",
    listDescription: "Scheduled scrapes for Facebook pages in this workspace.",
    emptyTitle: "No Facebook page jobs yet",
    emptyDescription: "Create a dataSource to scrape a Facebook page on a schedule.",
    createLabel: "Create job",
    formCreateTitle: "Create Facebook page job",
    formCreateDescription:
      "Schedule a recurring scrape for a Facebook page. Syncs to QStash when enabled.",
    formEditDescription:
      "Update the Facebook page scrape dataSource and resync its QStash schedule.",
  },
  website: {
    key: "website",
    segment: "website",
    label: "Website",
    icon: GlobeIcon,
    sourceType: "scrape-website",
    listTitle: "Website",
    listDescription: "Scheduled scrapes for websites in this workspace.",
    emptyTitle: "No website jobs yet",
    emptyDescription: "Create a dataSource to scrape a website on a schedule.",
    createLabel: "Create job",
    formCreateTitle: "Create website job",
    formCreateDescription:
      "Schedule a recurring scrape for a website. Syncs to QStash when enabled.",
    formEditDescription:
      "Update the website scrape dataSource and resync its QStash schedule.",
  },
} as const satisfies Record<DataSourceMenuKey, DataSourceMenuConfig>;

export const DATA_SOURCE_MENU_NAV_ITEMS = Object.values(DATA_SOURCE_MENU_CONFIGS).map(
  ({ key, segment, icon }) => ({
    labelKey: `nav.${key}` as const,
    segment,
    icon,
  }),
);

export function getDataSourceMenuConfig(key: DataSourceMenuKey): DataSourceMenuConfig {
  return DATA_SOURCE_MENU_CONFIGS[key];
}

export function getDataSourceMenuConfigBySegment(
  segment: string,
): DataSourceMenuConfig | null {
  return (
    Object.values(DATA_SOURCE_MENU_CONFIGS).find((config) => config.segment === segment) ??
    null
  );
}

export function getDataSourceMenuConfigByJobType(
  sourceType: SourceType,
): DataSourceMenuConfig | null {
  return (
    Object.values(DATA_SOURCE_MENU_CONFIGS).find((config) => config.sourceType === sourceType) ??
    null
  );
}

export function getDataSourceMenuHref(
  workspaceIndex: number,
  menu: DataSourceMenuConfig,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${menu.segment}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}
