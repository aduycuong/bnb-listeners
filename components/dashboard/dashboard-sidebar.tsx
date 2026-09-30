"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGridIcon } from "lucide-react";
import { useT } from "next-i18next/client";

import { AccountMenu } from "@/components/dashboard/account-menu";
import { DashboardSidebarLogo } from "@/components/dashboard/dashboard-sidebar-logo";
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
  getDashboardNavHref,
  isDashboardNavActive,
} from "@/lib/dashboard/nav-items";
import { sidebarNavMenuButtonClassName } from "@/lib/dashboard/sidebar-menu-styles";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type RootSidebarProps = {
  mode: "root";
  workspaces: WorkspaceListItem[];
};

type WorkspaceSidebarProps = {
  mode: "workspace";
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

export type DashboardSidebarProps = RootSidebarProps | WorkspaceSidebarProps;

export function DashboardSidebar(props: DashboardSidebarProps) {
  const pathname = usePathname();
  const { t } = useT("dashboard");

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-2 overflow-hidden p-2 px-3">
        <DashboardSidebarLogo />
        {props.mode === "workspace" ? (
          <WorkspaceSwitcher
            activeWorkspace={props.workspace}
            workspaces={props.workspaces}
            workspaceIndex={props.workspaceIndex}
          />
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-2 px-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {props.mode === "root" ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t("nav.workspaces")}
                    isActive={pathname === "/"}
                    className={sidebarNavMenuButtonClassName}
                    render={<Link href="/" />}
                  >
                    <LayoutGridIcon />
                    <span>{t("nav.workspaces")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                DASHBOARD_NAV_ITEMS.map(({ labelKey, segment, icon: Icon }) => {
                  const label = t(labelKey);
                  const href = getDashboardNavHref(
                    props.workspaceIndex,
                    segment,
                  );
                  const isActive = isDashboardNavActive(
                    pathname,
                    href,
                    segment,
                  );

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
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="overflow-hidden p-2 px-3">
        {props.mode === "workspace" ? (
          <AccountMenu
            workspaceIndex={props.workspaceIndex}
            permission={props.workspace.permission}
          />
        ) : (
          <AccountMenu
            workspaceIndex={props.workspaces.length > 0 ? 0 : null}
            permission={props.workspaces[0]?.permission ?? null}
          />
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
