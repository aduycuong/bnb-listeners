"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createTopicBackfillRunRequest,
  estimateTopicBackfillRequest,
} from "@/components/topics/topic-backfill-request";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  chatModelIds,
  chatModelRegistry,
  type ChatModelId,
} from "@/lib/langchain";
import { DEFAULT_TOPIC_BACKFILL_MODEL } from "@/lib/topics/topic-backfill-config";
import type { EstimateTopicBackfillResult } from "@/lib/topic-backfill/types";
import type { GetTopicResult } from "@/lib/topics/types";

type TopicBackfillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  topic: GetTopicResult;
  onStarted: () => Promise<void>;
};

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function dateInputToIso(dateValue: string): string {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined).format(value);
}

export function TopicBackfillDialog({
  open,
  onOpenChange,
  workspaceId,
  topic,
  onStarted,
}: TopicBackfillDialogProps) {
  const maxDate = useMemo(
    () => toDateInputValue(topic.createdAt),
    [topic.createdAt],
  );
  const defaultDate = useMemo(
    () => toDateInputValue(topic.listeningStartedAt),
    [topic.listeningStartedAt],
  );

  const [listeningDate, setListeningDate] = useState(defaultDate);
  const [model, setModel] = useState<ChatModelId>(DEFAULT_TOPIC_BACKFILL_MODEL);
  const [includeAlreadyAssigned, setIncludeAlreadyAssigned] = useState(false);
  const [estimate, setEstimate] = useState<EstimateTopicBackfillResult | null>(
    null,
  );
  const [estimating, setEstimating] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setListeningDate(defaultDate);
    setModel(DEFAULT_TOPIC_BACKFILL_MODEL);
    setIncludeAlreadyAssigned(false);
    setEstimate(null);
  }, [defaultDate, open]);

  async function handleEstimate() {
    setEstimating(true);

    try {
      const result = await estimateTopicBackfillRequest(
        workspaceId,
        topic.id,
        {
          newListeningStartedAt: dateInputToIso(listeningDate),
          model,
          includeAlreadyAssigned,
        },
      );
      setEstimate(result);
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Could not estimate backfill.",
        type: "error",
      });
    } finally {
      setEstimating(false);
    }
  }

  async function handleConfirm() {
    setStarting(true);

    try {
      await createTopicBackfillRunRequest(workspaceId, topic.id, {
        newListeningStartedAt: dateInputToIso(listeningDate),
        model,
        includeAlreadyAssigned,
      });
      toast.add({ title: "Backfill started.", type: "success" });
      onOpenChange(false);
      await onStarted();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Could not start backfill.",
        type: "error",
      });
    } finally {
      setStarting(false);
    }
  }

  const dateInvalid = listeningDate > maxDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rebuild topic data</DialogTitle>
          <DialogDescription>
            Scan older documents published before this topic was created and
            assign matches. Listening start date cannot be after the topic
            created date ({maxDate}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backfill-listening-date">New listening start</Label>
            <Input
              id="backfill-listening-date"
              type="date"
              max={maxDate}
              value={listeningDate}
              onChange={(event) => {
                setListeningDate(event.target.value);
                setEstimate(null);
              }}
            />
            {dateInvalid ? (
              <p className="text-xs text-destructive">
                Listening start cannot be after the topic created date.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="backfill-model">Model</Label>
            <Select
              value={model}
              onValueChange={(value) => {
                setModel(value as ChatModelId);
                setEstimate(null);
              }}
            >
              <SelectTrigger id="backfill-model" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {chatModelIds.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>
                    {chatModelRegistry[modelId].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="backfill-include-assigned">
                Include assigned documents
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, documents already linked to this topic are also
                re-evaluated. When disabled, only unassigned documents in the
                date range are checked.
              </p>
            </div>
            <Switch
              id="backfill-include-assigned"
              checked={includeAlreadyAssigned}
              onCheckedChange={(checked) => {
                setIncludeAlreadyAssigned(checked);
                setEstimate(null);
              }}
            />
          </div>

          {estimate ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Documents to check:</span>{" "}
                {formatNumber(estimate.estimate.documentCount)}
              </p>
              <p>
                <span className="text-muted-foreground">Estimated tokens:</span>{" "}
                {formatNumber(estimate.estimate.inputTokens)} in /{" "}
                {formatNumber(estimate.estimate.outputTokens)} out
              </p>
              <p>
                <span className="text-muted-foreground">Estimated cost:</span>{" "}
                {formatUsd(estimate.estimate.costUsd)}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={starting}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleEstimate()}
            disabled={estimating || starting || dateInvalid || !listeningDate}
          >
            {estimating ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Estimating…
              </>
            ) : (
              "Estimate"
            )}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={
              starting ||
              estimating ||
              dateInvalid ||
              !listeningDate ||
              !estimate
            }
          >
            {starting ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Starting…
              </>
            ) : (
              "Confirm & start"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
