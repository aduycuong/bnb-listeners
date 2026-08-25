"use client";

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useT } from "next-i18next/client";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", labelKey: "theme.light", icon: SunIcon },
  { value: "dark", labelKey: "theme.dark", icon: MoonIcon },
  { value: "system", labelKey: "theme.system", icon: MonitorIcon },
] as const;

export function ThemeModeToggle() {
  const { t } = useT("common");
  const { theme, setTheme, resolvedTheme } = useTheme();

  const ActiveIcon =
    theme === "dark"
      ? MoonIcon
      : theme === "light"
        ? SunIcon
        : resolvedTheme === "dark"
          ? MoonIcon
          : SunIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("theme.label")}
            className="size-8"
          />
        }
      >
        <ActiveIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
              <Icon className="size-4" />
              {t(labelKey)}
              {theme === value ? (
                <CheckIcon className="ml-auto size-4 text-muted-foreground" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
