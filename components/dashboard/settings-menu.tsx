"use client";

import Link from "next/link";
import { UserIcon } from "lucide-react";
import { useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";

type SettingsMenuProps = {
  workspaceIndex: number;
};

export function SettingsMenu({ workspaceIndex }: SettingsMenuProps) {
  const { t } = useT("dashboard");

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      nativeButton={false}
      aria-label={t("settingsMenu.profile")}
      className="size-8"
      render={<Link href={`/w/${workspaceIndex}/settings/profile`} />}
    >
      <UserIcon className="size-4" />
    </Button>
  );
}
