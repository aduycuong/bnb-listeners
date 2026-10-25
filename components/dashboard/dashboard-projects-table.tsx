import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";
import { growthPercent } from "@/lib/metrics/formulas";
import { PROJECT_CASE_ICONS } from "@/lib/projects/project-cases";
import { cn } from "@/lib/utils";

type DashboardProjectsTableProps = {
  workspaceIndex: number;
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

export function DashboardProjectsTable({
  workspaceIndex,
  data,
  isLoading = false,
}: DashboardProjectsTableProps) {
  const { t } = useT("dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.projects.title")}</CardTitle>
        <CardDescription>{t("overview.projects.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : data.projects.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t("overview.projects.empty")}
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/w/${workspaceIndex}/projects/new`} />}
            >
              <PlusIcon data-icon="inline-start" />
              {t("overview.projects.create")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("overview.projects.project")}</TableHead>
                <TableHead className="text-right">
                  {t("overview.projects.mentions")}
                </TableHead>
                <TableHead className="text-right">
                  {t("overview.projects.change")}
                </TableHead>
                <TableHead className="text-right">
                  {t("overview.projects.nss")}
                </TableHead>
                <TableHead className="text-right">
                  {t("overview.projects.negative")}
                </TableHead>
                <TableHead className="text-right">
                  {t("overview.projects.alerts")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((project) => {
                const growth = growthPercent(
                  project.mentions,
                  project.previousMentions,
                );
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={getProjectNavHref(
                          workspaceIndex,
                          project.projectIndex,
                          "",
                        )}
                        className="flex flex-col hover:underline"
                      >
                        <span className="font-medium">
                          <span aria-hidden="true">
                            {PROJECT_CASE_ICONS[project.case]}
                          </span>{" "}
                          {project.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`cases.${project.case}`)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.mentions.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        growth === null
                          ? "text-muted-foreground"
                          : growth >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive",
                      )}
                    >
                      {growth === null
                        ? "—"
                        : `${growth > 0 ? "+" : ""}${growth}%`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.nss === null
                        ? "—"
                        : `${project.nss > 0 ? "+" : ""}${project.nss}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.negativeShare === null
                        ? "—"
                        : `${project.negativeShare}%`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.alerts.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
