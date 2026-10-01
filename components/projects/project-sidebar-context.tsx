"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useT } from "next-i18next/client";

import { useQuery } from "@tanstack/react-query";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchProjects,
  projectsQueryKey,
} from "@/hooks/use-project-route-context";
import { getDashboardNavHref } from "@/lib/dashboard/nav-items";
import { sidebarNavMenuButtonClassName } from "@/lib/dashboard/sidebar-menu-styles";
import { cn } from "@/lib/utils";

type ProjectSidebarContextProps = {
  workspaceId: string;
  workspaceIndex: number;
  projectIndex: number;
};

export function ProjectSidebarContext({
  workspaceId,
  workspaceIndex,
  projectIndex,
}: ProjectSidebarContextProps) {
  const { t } = useT("dashboard");
  const { data, isLoading } = useQuery({
    queryKey: projectsQueryKey(workspaceId),
    queryFn: () => fetchProjects(workspaceId),
  });
  const projectName = data?.items[projectIndex]?.name;
  const backLabel = t("nav.backToProjects");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={projectName ? `${backLabel}: ${projectName}` : backLabel}
          className={cn(
            sidebarNavMenuButtonClassName,
            "font-medium text-sidebar-foreground",
          )}
          render={
            <Link
              href={getDashboardNavHref(workspaceIndex, "projects")}
              aria-label={
                projectName ? `${backLabel}: ${projectName}` : backLabel
              }
            />
          }
        >
          <ArrowLeftIcon />
          {projectName ? (
            <span>{projectName}</span>
          ) : isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span>{backLabel}</span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
