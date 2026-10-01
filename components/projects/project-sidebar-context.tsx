"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import {
  PROJECT_CASE_ICONS,
} from "@/lib/projects/project-cases";
import type { ProjectListItem } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectSidebarContextProps = {
  workspaceName: string;
  workspaceIndex: number;
  projectIndex: number;
  projects: ProjectListItem[];
  isLoading: boolean;
};

function currentProjectSegment(pathname: string) {
  const match = pathname.match(/^\/w\/\d+\/p\/\d+\/([^/]+)/);
  return match?.[1] ?? "";
}

export function ProjectSidebarContext({
  workspaceName,
  workspaceIndex,
  projectIndex,
  projects,
  isLoading,
}: ProjectSidebarContextProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { t } = useT("dashboard");
  const project = projects[projectIndex];
  const segment = currentProjectSegment(pathname);

  if (!project && isLoading) {
    return <Skeleton className="h-12 w-full rounded-[16px] bg-white/20" />;
  }

  if (!project) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-[16px] border border-white/28 bg-white/16 px-2.5 py-2 text-left text-white outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        aria-label={project.name}
      >
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-white text-[15px] text-primary group-data-[collapsible=icon]:size-8">
          {PROJECT_CASE_ICONS[project.case]}
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <small className="block truncate text-[11.5px] text-sidebar-muted">
            {t(`cases.${project.case}`)}
          </small>
          <b className="block truncate text-[13px] font-semibold">{project.name}</b>
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-70 group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80"
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 pt-1.5 text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            {t("nav.projectsInWorkspace", { workspace: workspaceName })}
          </DropdownMenuLabel>
          {projects.map((item, index) => {
            const selected = index === projectIndex;

            return (
              <DropdownMenuItem
                key={item.id}
                className={cn(
                  "items-start gap-2.5",
                  selected && "bg-[var(--tile-blue)]",
                )}
                onClick={() => {
                  router.push(
                    getProjectNavHref(workspaceIndex, index, segment),
                  );
                }}
              >
                <span className="mt-0.5 text-base leading-none">
                  {PROJECT_CASE_ICONS[item.case]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {t(`cases.${item.case}`)}
                  </span>
                </span>
                {selected ? (
                  <CheckIcon className="mt-0.5 size-4 text-primary" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="font-semibold text-primary"
          onClick={() => {
            router.push(`/w/${workspaceIndex}/projects`);
          }}
        >
          {t("nav.allProjects")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
