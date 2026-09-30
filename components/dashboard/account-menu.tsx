"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  LanguagesIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { useChangeLanguage, useT } from "next-i18next/client";
import { useTheme } from "next-themes";

import { authMeQueryKey } from "@/components/admin/admin-query-keys";
import { useAuth } from "@/components/auth/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/constants";
import {
  sidebarAccountMenuButtonClassName,
  sidebarPrimaryMediaClassName,
} from "@/lib/dashboard/sidebar-menu-styles";
import type { WorkspacePermission } from "@/lib/workspaces/types";

const THEME_OPTIONS = [
  { value: "light", labelKey: "theme.light", icon: SunIcon },
  { value: "dark", labelKey: "theme.dark", icon: MoonIcon },
  { value: "system", labelKey: "theme.system", icon: MonitorIcon },
] as const;

type AccountMenuProps = {
  workspaceIndex?: number | null;
  permission?: WorkspacePermission | null;
};

async function fetchAuthMe(): Promise<{ role: string }> {
  const res = await fetch("/api/auth/me");
  const data = (await res.json()) as { role?: string; error?: string; message?: string };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load session.");
  }

  return { role: data.role ?? "user" };
}

function getUserInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }

  return displayName.slice(0, 2).toUpperCase() || "?";
}

export function AccountMenu({
  workspaceIndex = null,
  permission = null,
}: AccountMenuProps) {
  const { t: tDashboard } = useT("dashboard");
  const { t: tCommon } = useT("common");
  const { user, signOut } = useAuth();
  const changeLanguage = useChangeLanguage();
  const { i18n } = useT("common");
  const { theme: activeTheme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data: authMe } = useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchAuthMe,
    staleTime: 60_000,
  });

  const currentLanguage = i18n.language?.startsWith("vi") ? "vi" : "en";
  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    tDashboard("accountMenu.userFallback");
  const roleLabel = permission
    ? tDashboard(`workspacePermission.${permission}`)
    : tDashboard("accountMenu.userFallback");
  const profileHref =
    workspaceIndex === null || workspaceIndex === undefined
      ? null
      : `/w/${workspaceIndex}/settings/profile`;
  const isAdmin = authMe?.role === "admin";

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setLogoutOpen(false);
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  tooltip={displayName}
                  className={sidebarAccountMenuButtonClassName}
                  aria-label={tDashboard("accountMenu.openMenu")}
                />
              }
            >
              <Avatar className={sidebarPrimaryMediaClassName}>
                {user?.photoURL ? (
                  <AvatarImage src={user.photoURL} alt={displayName} />
                ) : null}
                <AvatarFallback>{getUserInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              align="end"
              side={isMobile ? "top" : "right"}
              sideOffset={4}
            >
              {user?.email ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              {profileHref || isAdmin ? (
                <>
                  <DropdownMenuGroup>
                    {profileHref ? (
                      <DropdownMenuItem render={<Link href={profileHref} />}>
                        <UserIcon />
                        {tDashboard("accountMenu.profile")}
                      </DropdownMenuItem>
                    ) : null}
                    {isAdmin ? (
                      <DropdownMenuItem
                        render={<Link href="/admin/system-schedules" />}
                      >
                        <ShieldIcon />
                        {tDashboard("accountMenu.admin")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <LanguagesIcon />
                    {tCommon("language.label")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {SUPPORTED_LANGUAGES.map((value) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => {
                          void changeLanguage(value);
                        }}
                      >
                        {tCommon(`language.${value}`)}
                        {currentLanguage === value ? (
                          <CheckIcon className="ml-auto text-muted-foreground" />
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <SunIcon />
                    {tCommon("theme.label")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => setTheme(value)}
                      >
                        <Icon />
                        {tCommon(labelKey)}
                        {activeTheme === value ? (
                          <CheckIcon className="ml-auto text-muted-foreground" />
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOutIcon />
                {tDashboard("logout.label")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDashboard("logout.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDashboard("logout.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={signingOut}
              onClick={handleSignOut}
            >
              {tDashboard("logout.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
