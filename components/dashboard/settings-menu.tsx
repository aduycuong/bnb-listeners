"use client";

import { SettingsIcon, UserIcon } from "lucide-react";
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
    label: "Profile",
    icon: UserIcon,
    href: (workspaceIndex: number) =>
      `/w/${workspaceIndex}/settings/profile`,
  },
  {
    label: "Settings",
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            className="size-8"
          />
        }
      >
        <SettingsIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Settings</DropdownMenuLabel>
          {SETTINGS_ITEMS.map(({ label, icon: Icon, href }) => (
            <DropdownMenuItem
              key={label}
              className="whitespace-nowrap"
              onClick={() => router.push(href(workspaceIndex))}
            >
              <Icon className="size-4" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
