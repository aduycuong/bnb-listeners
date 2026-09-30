"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";

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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_ICON_SRC } from "@/lib/dashboard/app-icon";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  activeWorkspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

export function WorkspaceSwitcher({
  activeWorkspace,
  workspaces,
  workspaceIndex,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={activeWorkspace.name}
                className={cn(
                  "font-normal text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                  "group-data-[collapsible=icon]:hover:bg-transparent group-data-[collapsible=icon]:active:bg-transparent group-data-[collapsible=icon]:data-open:bg-transparent group-data-[collapsible=icon]:data-open:hover:bg-transparent group-data-[collapsible=icon]:data-popup-open:bg-transparent group-data-[collapsible=icon]:data-[state=open]:bg-transparent",
                )}
              />
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APP_ICON_SRC}
              alt=""
              className="size-8 shrink-0"
            />
            <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
              {activeWorkspace.name}
            </span>
            <ChevronsUpDownIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
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
                  <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
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
        <div className="flex size-5 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
          {activeWorkspace.name.charAt(0)}
        </div>
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
