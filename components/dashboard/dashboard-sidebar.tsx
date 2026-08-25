"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "next-i18next/client";

import { LanguageSelector } from "@/components/dashboard/language-selector";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { SettingsMenu } from "@/components/dashboard/settings-menu";
import { ThemeModeToggle } from "@/components/dashboard/theme-mode-toggle";
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
  getDashboardNavHref,
  isDashboardNavActive,
} from "@/lib/dashboard/nav-items";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type DashboardSidebarProps = {
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

export function DashboardSidebar({
  workspace,
  workspaces,
  workspaceIndex,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { t } = useT("dashboard");

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <WorkspaceSwitcher
          activeWorkspace={workspace}
          workspaces={workspaces}
          workspaceIndex={workspaceIndex}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.workspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DASHBOARD_NAV_ITEMS.map(({ labelKey, segment, icon: Icon }) => {
                const label = t(labelKey);
                const href = getDashboardNavHref(workspaceIndex, segment);
                const isActive = isDashboardNavActive(pathname, href, segment);

                return (
                  <SidebarMenuItem key={segment || "overview"}>
                    <SidebarMenuButton
                      tooltip={label}
                      isActive={isActive}
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

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-center gap-1">
          <SettingsMenu workspaceIndex={workspaceIndex} />
          <LanguageSelector />
          <ThemeModeToggle />
          <LogoutButton />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
