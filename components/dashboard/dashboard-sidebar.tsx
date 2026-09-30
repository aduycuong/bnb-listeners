"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "next-i18next/client";

import { AccountMenu } from "@/components/dashboard/account-menu";
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
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type DashboardSidebarProps = {
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

const sidebarItemClassName =
  "h-[34px]! text-[15px]! font-normal text-sidebar-foreground/80 [&_svg]:size-[17px]! group-data-[collapsible=icon]:[&_svg]:size-[17px]! data-active:font-normal data-active:text-sidebar-foreground";

export function DashboardSidebar({
  workspace,
  workspaces,
  workspaceIndex,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { t } = useT("dashboard");

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-3">
        <WorkspaceSwitcher
          activeWorkspace={workspace}
          workspaces={workspaces}
          workspaceIndex={workspaceIndex}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {DASHBOARD_NAV_ITEMS.map(({ labelKey, segment, icon: Icon }) => {
                const label = t(labelKey);
                const href = getDashboardNavHref(workspaceIndex, segment);
                const isActive = isDashboardNavActive(pathname, href, segment);

                return (
                  <SidebarMenuItem key={segment || "overview"}>
                    <SidebarMenuButton
                      tooltip={label}
                      isActive={isActive}
                      className={sidebarItemClassName}
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

      <SidebarFooter className="px-3">
        <AccountMenu
          workspaceIndex={workspaceIndex}
          permission={workspace.permission}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
