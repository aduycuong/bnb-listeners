"use client";

import { SettingsIcon, UserIcon } from "lucide-react";
import { useT } from "next-i18next/client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SETTINGS_ITEMS = [
  {
    labelKey: "settingsMenu.profile",
    icon: UserIcon,
    href: (workspaceIndex: number) =>
      `/w/${workspaceIndex}/settings/profile`,
  },
  {
    labelKey: "settingsMenu.workspace",
    icon: SettingsIcon,
    href: (workspaceIndex: number) =>
      `/w/${workspaceIndex}/settings/workspace`,
  },
] as const;

type SettingsMenuProps = {
  workspaceIndex: number;
};

export function SettingsMenu({ workspaceIndex }: SettingsMenuProps) {
  const router = useRouter();
  const { t } = useT("dashboard");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("settingsMenu.label")}
            className="size-8"
          />
        }
      >
        <SettingsIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("settingsMenu.label")}</DropdownMenuLabel>
          {SETTINGS_ITEMS.map(({ labelKey, icon: Icon, href }) => (
            <DropdownMenuItem
              key={labelKey}
              className="whitespace-nowrap"
              onClick={() => router.push(href(workspaceIndex))}
            >
              <Icon className="size-4" />
              {t(labelKey)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
