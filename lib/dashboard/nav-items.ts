import { FileTextIcon, FilesIcon } from "lucide-react";

import { DOCUMENT_SEGMENT } from "@/lib/documents/document-config";
import { JOB_MENU_NAV_ITEMS } from "@/lib/jobs/job-menu-config";

export const DASHBOARD_NAV_ITEMS = [
  { labelKey: "nav.overview", segment: "", icon: FileTextIcon },
  { labelKey: "nav.documents", segment: DOCUMENT_SEGMENT, icon: FilesIcon },
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
