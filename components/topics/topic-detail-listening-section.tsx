"use client";

import { useState } from "react";

import { TopicBackfillDialog } from "@/components/topics/topic-backfill-dialog";
import { TopicBackfillStatus } from "@/components/topics/topic-backfill-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GetTopicResult } from "@/lib/topics/types";

type TopicDetailListeningSectionProps = {
  workspaceId: string;
  topic: GetTopicResult;
  canEdit: boolean;
  onTopicUpdated: () => Promise<void>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TopicDetailListeningSection({
  workspaceId,
  topic,
  canEdit,
  onTopicUpdated,
}: TopicDetailListeningSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasActiveBackfill = Boolean(topic.activeBackfillRun);

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
              <dd className="mt-1">{formatDateTime(topic.listeningStartedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Topic created
              </dt>
              <dd className="mt-1">{formatDateTime(topic.createdAt)}</dd>
            </div>
          </dl>

          {topic.activeBackfillRun ? (
            <TopicBackfillStatus
              workspaceId={workspaceId}
              topicId={topic.id}
              run={topic.activeBackfillRun}
              onUpdated={onTopicUpdated}
            />
          ) : null}

          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              disabled={hasActiveBackfill}
            >
              Rebuild topic data
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TopicBackfillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        topic={topic}
        onStarted={onTopicUpdated}
      />
    </>
  );
}
