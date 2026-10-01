"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { useState } from "react";

import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchProjects,
  projectsQueryKey,
} from "@/hooks/use-project-route-context";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { PROJECT_CASE_ICONS } from "@/lib/projects/project-cases";

type ProjectListPageProps = {
  workspaceIndexParam: string;
};

export function ProjectListPage({ workspaceIndexParam }: ProjectListPageProps) {
  const { t } = useT("dashboard");
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: projectsQueryKey(workspace?.id ?? "pending"),
    queryFn: () => fetchProjects(workspace!.id),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return null;
  }

  const projects = data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-5 md:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Each project listens for one brand or campaign. Terms live inside
            the project.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Create project
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      {projects.length === 0 && !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Create a project before adding listening terms.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project, index) => (
            <Link
              key={project.id}
              href={getProjectNavHref(workspaceIndex, index, "")}
            >
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span aria-hidden="true">{PROJECT_CASE_ICONS[project.case]}</span>
                    {project.name}
                    <span className="rounded-full bg-[var(--tile-sun)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--tile-sun-foreground)]">
                      {t(`cases.${project.case}`)}
                    </span>
                  </CardTitle>
                  {project.description ? (
                    <CardDescription>{project.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Open dashboard
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspace.id}
        workspaceIndex={workspaceIndex}
        projectCount={projects.length}
      />
    </div>
  );
}
