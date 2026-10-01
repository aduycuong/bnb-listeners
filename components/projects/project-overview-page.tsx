"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getTermHref } from "@/lib/terms/term-config";

type ProjectOverviewPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
};

export function ProjectOverviewPage({
  workspaceIndexParam,
  projectIndexParam,
}: ProjectOverviewPageProps) {
  const { workspaceIndex, project, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!project) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>
            {project.description?.trim() ||
              "Social listening project. Terms for this brand or campaign live here. Reports come later."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={
              <Link href={getTermHref(workspaceIndex, projectIndex)} />
            }
          >
            Open terms
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
