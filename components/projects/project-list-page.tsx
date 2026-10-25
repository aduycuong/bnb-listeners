"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";

import { ProjectSummaryCard } from "@/components/projects/project-summary-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectSummaries } from "@/hooks/use-project-summaries";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";

type ProjectListPageProps = {
  workspaceIndexParam: string;
};

const CARD_GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

export function ProjectListPage({ workspaceIndexParam }: ProjectListPageProps) {
  const { t } = useT("dashboard");
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);
  const { data, isLoading, error } = useProjectSummaries(workspace?.id);

  if (!workspace) {
    return null;
  }

  const projects = data?.items ?? [];

  return (
    <div className="w-full space-y-4 px-4 py-5 md:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("projectList.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("projectList.description", { days: data?.periodDays ?? 14 })}
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href={`/w/${workspaceIndex}/projects/new`} />}
        >
          <PlusIcon data-icon="inline-start" />
          {t("projectList.create")}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      {isLoading ? (
        <div className={CARD_GRID}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("projectList.emptyTitle")}</CardTitle>
            <CardDescription>{t("projectList.emptyDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className={CARD_GRID}>
          {projects.map((project, index) => (
            <ProjectSummaryCard
              key={project.id}
              project={project}
              href={getProjectNavHref(workspaceIndex, index, "")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
