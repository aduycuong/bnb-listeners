import { DATA_SOURCE_GROUP_SEGMENT } from "@/lib/data-source-groups/data-source-group-config";
import { getDataSourceMenuConfigBySegment } from "@/lib/data-sources/data-source-menu-config";
import { DOCUMENT_SEGMENT } from "@/lib/documents/document-config";
import { RESEARCH_SEGMENT } from "@/lib/research/research-config";
import { TERM_SEGMENT } from "@/lib/terms/term-config";

import { DASHBOARD_NAV_ITEMS } from "./nav-items";

export type DashboardBreadcrumbItem = {
  labelKey: string;
  href?: string;
};

const SECTION_LABEL_KEYS = Object.fromEntries(
  DASHBOARD_NAV_ITEMS.filter((item) => item.segment).map((item) => [
    item.segment,
    item.labelKey,
  ]),
) as Record<string, string>;

function getWorkspaceRoute(pathname: string) {
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  if (segments.length < 2 || segments[0] !== "w") {
    return null;
  }

  const workspaceIndex = Number(segments[1]);

  if (!Number.isInteger(workspaceIndex) || workspaceIndex < 0) {
    return null;
  }

  return {
    workspaceIndex,
    rest: segments.slice(2),
  };
}

function homeCrumb(workspaceIndex: number): DashboardBreadcrumbItem {
  return {
    labelKey: "header.home",
    href: `/w/${workspaceIndex}`,
  };
}

function sectionCrumb(
  workspaceIndex: number,
  section: string,
): DashboardBreadcrumbItem | null {
  const dataSourceConfig = getDataSourceMenuConfigBySegment(section);
  const labelKey =
    SECTION_LABEL_KEYS[section] ??
    (dataSourceConfig ? (`nav.${dataSourceConfig.key}` as const) : null);

  if (!labelKey) {
    return null;
  }

  return {
    labelKey,
    href: `/w/${workspaceIndex}/${section}`,
  };
}

export function getDashboardBreadcrumbs(
  pathname: string,
): DashboardBreadcrumbItem[] {
  const route = getWorkspaceRoute(pathname);

  if (!route) {
    return [{ labelKey: "header.home" }];
  }

  const { workspaceIndex, rest } = route;
  const home = homeCrumb(workspaceIndex);

  if (rest.length === 0) {
    return [{ labelKey: home.labelKey }];
  }

  const section = rest[0]!;

  if (section === "settings") {
    if (rest[1] === "profile") {
      return [home, { labelKey: "accountMenu.profile" }];
    }

    return [home, { labelKey: "nav.settings" }];
  }

  const listCrumb = sectionCrumb(workspaceIndex, section);

  if (!listCrumb) {
    return [{ labelKey: home.labelKey }];
  }

  if (rest.length === 1) {
    return [home, { labelKey: listCrumb.labelKey }];
  }

  if (rest[1] === "new") {
    return [home, listCrumb, { labelKey: "header.create" }];
  }

  if (rest.length === 2) {
    const detailKeys: Record<string, string> = {
      [DOCUMENT_SEGMENT]: "header.documentDetail",
      [TERM_SEGMENT]: "header.termDetail",
      [DATA_SOURCE_GROUP_SEGMENT]: "header.dataSourceGroupDetail",
      [RESEARCH_SEGMENT]: "header.researchRunDetail",
      "facebook-page": "header.dataSourceDetail",
      website: "header.dataSourceDetail",
    };

    const detailKey = detailKeys[section] ?? "header.detail";
    return [home, listCrumb, { labelKey: detailKey }];
  }

  return [home, { labelKey: listCrumb.labelKey }];
}
