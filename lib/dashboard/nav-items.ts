import {
  FileTextIcon,
  FilesIcon,
  FolderKanbanIcon,
  LayersIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SettingsIcon,
  TagsIcon,
} from "lucide-react";

import { DOCUMENT_SEGMENT } from "@/lib/documents/document-config";
import { DATA_SOURCE_GROUP_SEGMENT } from "@/lib/data-source-groups/data-source-group-config";
import { DATA_SOURCE_MENU_NAV_ITEMS } from "@/lib/data-sources/data-source-menu-config";
import { RESEARCH_SEGMENT } from "@/lib/research/research-config";
import { TERM_SEGMENT } from "@/lib/terms/term-config";
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

export const PROJECT_NAV_ITEMS = [
  { labelKey: "nav.projectOverview", segment: "", icon: LayoutDashboardIcon },
  { labelKey: "nav.terms", segment: TERM_SEGMENT, icon: TagsIcon },
  { labelKey: "nav.projectSettings", segment: "settings", icon: SettingsIcon },
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
