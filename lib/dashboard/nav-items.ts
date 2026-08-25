import { FileTextIcon } from "lucide-react";

import { JOB_MENU_NAV_ITEMS } from "@/lib/jobs/job-menu-config";

export const DASHBOARD_NAV_ITEMS = [
  { label: "Overview", segment: "", icon: FileTextIcon },
  ...JOB_MENU_NAV_ITEMS,
];

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
