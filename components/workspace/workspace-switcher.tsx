"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useT } from "next-i18next/client";

import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import {
  sidebarWorkspaceMarkClassName,
  sidebarWorkspaceMenuButtonClassName,
} from "@/lib/dashboard/sidebar-menu-styles";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  activeWorkspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

function workspaceInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase() || "?";
}

export function WorkspaceSwitcher({
  activeWorkspace,
  workspaces,
  workspaceIndex,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { t } = useT("dashboard");
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
              className={sidebarWorkspaceMenuButtonClassName}
              aria-label={activeWorkspace.name}
            >
              <span className={sidebarWorkspaceMarkClassName}>
                {workspaceInitials(activeWorkspace.name)}
              </span>
              <span className="min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="block text-[12px] font-medium text-sidebar-muted">
                  {t("nav.workspace")}
                </span>
                <span className="block truncate text-[13.5px] font-semibold">
                  {activeWorkspace.name}
                </span>
              </span>
              <ChevronDownIcon className="ml-auto size-4 shrink-0 opacity-80 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Workspaces
                </DropdownMenuLabel>
                {workspaces.map((workspace, index) => (
                  <DropdownMenuItem
                    key={workspace.id}
                    onClick={() => {
                      setOpen(false);
                      if (index !== workspaceIndex) {
                        router.push(`/w/${index}`);
                      }
                    }}
                    className="gap-2 p-2"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {workspace.name}
                    </span>
                    <span
                      className={cn(
                        "ml-auto size-2 rounded-full bg-primary",
                        activeWorkspace.id !== workspace.id && "invisible",
                      )}
                    />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => {
                    setOpen(false);
                    setCreateDialogOpen(true);
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <PlusIcon className="size-4" />
                  </div>
                  <span className="text-muted-foreground">Create workspace</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceCount={workspaces.length}
      />
    </>
  );
}

export function WorkspaceSwitcherCompact({
  activeWorkspace,
  workspaces,
  workspaceIndex,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-9 gap-2 px-2.5 font-normal md:hidden"
          />
        }
      >
        <span className="max-w-[120px] truncate">{activeWorkspace.name}</span>
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace, index) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => {
                setOpen(false);
                if (index !== workspaceIndex) {
                  router.push(`/w/${index}`);
                }
              }}
              className="min-w-0"
            >
              <span className="truncate">{workspace.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
