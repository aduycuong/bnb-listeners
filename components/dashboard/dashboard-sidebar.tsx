"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DASHBOARD_NAV_ITEMS,
  PROJECT_NAV_GROUPS,
  getDashboardNavHref,
  getProjectNavHref,
  isDashboardNavActive,
} from "@/lib/dashboard/nav-items";
import {
  sidebarGroupLabelClassName,
  sidebarNavMenuButtonClassName,
} from "@/lib/dashboard/sidebar-menu-styles";
import {
  fetchProjects,
  projectsQueryKey,
} from "@/hooks/use-project-route-context";
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
  const { data, isLoading } = useQuery({
    queryKey: projectsQueryKey(workspace.id),
    queryFn: () => fetchProjects(workspace.id),
    enabled: activeProjectIndex !== null,
  });
  const projects = data?.items ?? [];
  const activeProject =
    activeProjectIndex === null ? null : (projects[activeProjectIndex] ?? null);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-2 overflow-hidden px-3.5 pt-5 pb-2">
        <DashboardSidebarLogo workspaceIndex={workspaceIndex} />
        <WorkspaceSwitcher
          activeWorkspace={workspace}
          workspaces={workspaces}
          workspaceIndex={workspaceIndex}
        />
        {activeProjectIndex !== null ? (
          <ProjectSidebarContext
            workspaceName={workspace.name}
            workspaceIndex={workspaceIndex}
            projectIndex={activeProjectIndex}
            projects={projects}
            isLoading={isLoading}
          />
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        {activeProjectIndex === null ? (
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {DASHBOARD_NAV_ITEMS.map(({ labelKey, segment, icon: Icon }) => {
                  const label = t(labelKey);
                  const href = getDashboardNavHref(workspaceIndex, segment);
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
        ) : (
          PROJECT_NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.labelKey} className="px-3 py-0">
              <SidebarGroupLabel className={sidebarGroupLabelClassName}>
                {t(group.labelKey)}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map(({ labelKey, segment, icon: Icon }) => {
                    const label =
                      segment === "case" && activeProject
                        ? t(`caseNav.${activeProject.case}`)
                        : t(labelKey);
                    const href = getProjectNavHref(
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
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/20 px-3.5 pt-3 pb-3.5">
        <AccountMenu
          workspaceIndex={workspaceIndex}
          permission={workspace.permission}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
