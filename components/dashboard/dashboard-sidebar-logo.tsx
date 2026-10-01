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

export function DashboardSidebarLogo({
  workspaceIndex,
}: {
  workspaceIndex: number;
}) {
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
              href={`/w/${workspaceIndex}`}
              aria-label={t("header.homeAriaLabel")}
            />
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={APP_ICON_SRC}
            alt=""
            className={`${sidebarPrimaryMediaClassName} object-contain`}
          />
          <span className="min-w-0 truncate text-[19px] font-extrabold tracking-tight text-white">
            BNB <span className="font-medium text-[#D6F0FF]">Listening</span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
