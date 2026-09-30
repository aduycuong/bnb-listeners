"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_ICON_SRC } from "@/lib/dashboard/app-icon";
import {
  sidebarBrandMenuButtonClassName,
  sidebarPrimaryMediaClassName,
} from "@/lib/dashboard/sidebar-menu-styles";

const BRAND_TITLE = "BNB Listening";

export function DashboardSidebarLogo() {
  const { t } = useT("dashboard");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip={BRAND_TITLE}
          className={sidebarBrandMenuButtonClassName}
          render={
            <Link
              href="/"
              aria-label={t("nav.workspacesHomeAriaLabel")}
            />
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={APP_ICON_SRC}
            alt=""
            className={`${sidebarPrimaryMediaClassName} object-contain`}
          />
          <span className="min-w-0 truncate font-semibold text-xl">
            <span className="text-sidebar-foreground">BNB</span>
            <span className="font-normal text-sidebar-foreground/85">
              {" "}
              Listening
            </span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
