import {
  BellIcon,
  FileBarChartIcon,
  FileTextIcon,
  FilesIcon,
  FolderKanbanIcon,
  HashIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  SearchIcon,
  SettingsIcon,
  Share2Icon,
  SmileIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { DOCUMENT_SEGMENT } from "@/lib/documents/document-config";
import { DATA_SOURCE_GROUP_SEGMENT } from "@/lib/data-source-groups/data-source-group-config";
import { DATA_SOURCE_MENU_NAV_ITEMS } from "@/lib/data-sources/data-source-menu-config";
import { RESEARCH_SEGMENT } from "@/lib/research/research-config";

export const DASHBOARD_NAV_ITEMS = [
  { labelKey: "nav.overview", segment: "", icon: FileTextIcon },
  { labelKey: "nav.documents", segment: DOCUMENT_SEGMENT, icon: FilesIcon },
  { labelKey: "nav.projects", segment: "projects", icon: FolderKanbanIcon },
  {
    labelKey: "nav.research",
    segment: RESEARCH_SEGMENT,
    icon: SearchIcon,
  },
  {
    labelKey: "nav.dataSourceGroups",
    segment: DATA_SOURCE_GROUP_SEGMENT,
    icon: LayersIcon,
  },
  ...DATA_SOURCE_MENU_NAV_ITEMS,
  { labelKey: "nav.settings", segment: "settings/workspace", icon: SettingsIcon },
];

export const PROJECT_DEMO_SECTIONS = [
  "mentions",
  "sentiment",
  "topics",
  "channels",
  "authors",
  "case",
  "alerts",
  "report",
] as const;

export type ProjectDemoSection = (typeof PROJECT_DEMO_SECTIONS)[number];

export function isProjectDemoSection(
  value: string,
): value is ProjectDemoSection {
  return (PROJECT_DEMO_SECTIONS as readonly string[]).includes(value);
}

export const PROJECT_NAV_GROUPS = [
  {
    labelKey: "nav.groupAnalysis",
    items: [
      { labelKey: "nav.projectOverview", segment: "", icon: LayoutDashboardIcon },
      { labelKey: "nav.mentions", segment: "mentions", icon: MessagesSquareIcon },
      { labelKey: "nav.sentiment", segment: "sentiment", icon: SmileIcon },
      { labelKey: "nav.topics", segment: "topics", icon: HashIcon },
      { labelKey: "nav.channels", segment: "channels", icon: Share2Icon },
      { labelKey: "nav.authors", segment: "authors", icon: UsersIcon },
    ],
  },
  {
    labelKey: "nav.groupCase",
    items: [
      { labelKey: "nav.caseSpecial", segment: "case", icon: SparklesIcon },
    ],
  },
  {
    labelKey: "nav.groupActions",
    items: [
      { labelKey: "nav.alerts", segment: "alerts", icon: BellIcon },
      { labelKey: "nav.report", segment: "report", icon: FileBarChartIcon },
    ],
  },
  {
    labelKey: "nav.groupProject",
    items: [{ labelKey: "nav.projectSettings", segment: "settings", icon: SettingsIcon }],
  },
];

export function getProjectNavHref(
  workspaceIndex: number,
  projectIndex: number,
  segment: string,
): string {
  const base = `/w/${workspaceIndex}/p/${projectIndex}`;
  if (!segment) {
    return base;
  }
  return `${base}/${segment}`;
}

export function getDashboardNavHref(
  workspaceIndex: number,
  segment: string,
): string {
  if (!segment) {
    return `/w/${workspaceIndex}`;
  }
  return `/w/${workspaceIndex}/${segment}`;
}

export function isDashboardNavActive(pathname: string, href: string, segment: string) {
  if (!segment) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
