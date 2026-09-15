"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DataSourceGroupDetail } from "@/lib/data-source-groups/types";

type DataSourceGroupDetailGeneralProps = {
  group: DataSourceGroupDetail;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DataSourceGroupDetailGeneral({
  group,
}: DataSourceGroupDetailGeneralProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Description
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            {group.description?.trim() || "—"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Members</p>
            <p className="mt-1 tabular-nums">
              {group.memberCount} data source
              {group.memberCount === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Created</p>
            <p className="mt-1">{formatDateTime(group.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Updated</p>
            <p className="mt-1">{formatDateTime(group.updatedAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
