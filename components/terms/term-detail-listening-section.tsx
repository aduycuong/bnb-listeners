"use client";

import { useState } from "react";

import { TermBackfillDialog } from "@/components/terms/term-backfill-dialog";
import { TermBackfillStatus } from "@/components/terms/term-backfill-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GetTermResult } from "@/lib/terms/types";

type TermDetailListeningSectionProps = {
  workspaceId: string;
  term: GetTermResult;
  canEdit: boolean;
  onTermUpdated: () => Promise<void>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TermDetailListeningSection({
  workspaceId,
  term,
  canEdit,
  onTermUpdated,
}: TermDetailListeningSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasActiveBackfill = Boolean(term.activeBackfillRun);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Listening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Listening since
              </dt>
              <dd className="mt-1">{formatDateTime(term.listeningStartedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Term created
              </dt>
              <dd className="mt-1">{formatDateTime(term.createdAt)}</dd>
            </div>
          </dl>

          {term.activeBackfillRun ? (
            <TermBackfillStatus
              workspaceId={workspaceId}
              termId={term.id}
              run={term.activeBackfillRun}
              onUpdated={onTermUpdated}
            />
          ) : null}

          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              disabled={hasActiveBackfill}
            >
              Rebuild term data
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TermBackfillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        term={term}
        onStarted={onTermUpdated}
      />
    </>
  );
}
