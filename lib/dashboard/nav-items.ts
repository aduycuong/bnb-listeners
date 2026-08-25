import { FileTextIcon, type LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  label: string;
  segment: string;
  icon: LucideIcon;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", segment: "", icon: FileTextIcon },
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
