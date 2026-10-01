"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "next-i18next/client";

import { AccountMenu } from "@/components/dashboard/account-menu";
import { DashboardSidebarLogo } from "@/components/dashboard/dashboard-sidebar-logo";
import { ProjectSidebarContext } from "@/components/projects/project-sidebar-context";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DASHBOARD_NAV_ITEMS,
  PROJECT_NAV_ITEMS,
  getDashboardNavHref,
  getProjectNavHref,
  isDashboardNavActive,
} from "@/lib/dashboard/nav-items";
import { sidebarNavMenuButtonClassName } from "@/lib/dashboard/sidebar-menu-styles";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type DashboardSidebarProps = {
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

function parseActiveProjectIndex(
  pathname: string,
  workspaceIndex: number,
): number | null {
  const match = pathname.match(/^\/w\/(\d+)\/p\/(\d+)(?:\/|$)/);
  if (!match || Number(match[1]) !== workspaceIndex) {
    return null;
  }

  const projectIndex = Number(match[2]);
  return Number.isInteger(projectIndex) ? projectIndex : null;
}

export function DashboardSidebar({
  workspace,
  workspaces,
  workspaceIndex,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { t } = useT("dashboard");
  const activeProjectIndex = parseActiveProjectIndex(pathname, workspaceIndex);
  const navItems =
    activeProjectIndex === null ? DASHBOARD_NAV_ITEMS : PROJECT_NAV_ITEMS;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-2 overflow-hidden p-2 px-3">
        <DashboardSidebarLogo workspaceIndex={workspaceIndex} />
        <WorkspaceSwitcher
          activeWorkspace={workspace}
          workspaces={workspaces}
          workspaceIndex={workspaceIndex}
        />
        {activeProjectIndex !== null ? (
          <ProjectSidebarContext
            workspaceId={workspace.id}
            workspaceIndex={workspaceIndex}
            projectIndex={activeProjectIndex}
          />
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-2 px-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map(({ labelKey, segment, icon: Icon }) => {
                const label = t(labelKey);
                const href =
                  activeProjectIndex === null
                    ? getDashboardNavHref(workspaceIndex, segment)
                    : getProjectNavHref(
                        workspaceIndex,
                        activeProjectIndex,
                        segment,
                      );
                const isActive = isDashboardNavActive(pathname, href, segment);

                return (
                  <SidebarMenuItem key={segment || "overview"}>
                    <SidebarMenuButton
                      tooltip={label}
                      isActive={isActive}
                      className={sidebarNavMenuButtonClassName}
                      render={<Link href={href} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="overflow-hidden p-2 px-3">
        <AccountMenu
          workspaceIndex={workspaceIndex}
          permission={workspace.permission}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
