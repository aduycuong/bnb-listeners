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
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <span className="text-sm font-semibold">
                {activeWorkspace.name.charAt(0)}
              </span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeWorkspace.name}</span>
              <span className="truncate text-xs capitalize text-muted-foreground">
                {activeWorkspace.permission}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
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
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background text-xs font-medium">
                    {workspace.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate">{workspace.name}</span>
                    <span className="block truncate text-xs capitalize text-muted-foreground">
                      {workspace.permission}
                    </span>
                  </div>
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
