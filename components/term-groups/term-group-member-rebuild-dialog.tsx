"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  createTermGroupMemberRebuildRunRequest,
  estimateTermGroupMemberRebuildRequest,
} from "@/components/term-groups/term-group-member-rebuild-request";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { EstimateTermGroupMemberRebuildResult } from "@/lib/term-group-member-rebuild/types";
import { DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL } from "@/lib/term-groups/term-group-member-rebuild-config";
import { TERM_GROUP_CONFIG } from "@/lib/term-groups/term-group-config";
import type { TermGroupDetail } from "@/lib/term-groups/types";

type TermGroupMemberRebuildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  group: TermGroupDetail;
  onStarted: () => Promise<void>;
};

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

export function TermGroupMemberRebuildDialog({
  open,
  onOpenChange,
  workspaceId,
  group,
  onStarted,
}: TermGroupMemberRebuildDialogProps) {
  const [model, setModel] = useState<ChatModelId>(
    DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  );
  const [includeAlreadyMembers, setIncludeAlreadyMembers] = useState(false);
  const [removeNonMatching, setRemoveNonMatching] = useState(false);
  const [enableWebResearch, setEnableWebResearch] = useState(true);
  const [estimate, setEstimate] =
    useState<EstimateTermGroupMemberRebuildResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setModel(DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL);
    setIncludeAlreadyMembers(false);
    setRemoveNonMatching(false);
    setEnableWebResearch(true);
    setEstimate(null);
  }, [open]);

  useEffect(() => {
    if (removeNonMatching) {
      setIncludeAlreadyMembers(true);
    }
  }, [removeNonMatching]);

  async function handleEstimate() {
    setEstimating(true);

    try {
      const result = await estimateTermGroupMemberRebuildRequest(
        workspaceId,
        group.id,
        {
          model,
          includeAlreadyMembers,
          removeNonMatching,
          enableWebResearch,
        },
      );
      setEstimate(result);
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : "Could not estimate member rebuild.",
        type: "error",
      });
    } finally {
      setEstimating(false);
    }
  }

  async function handleConfirm() {
    setStarting(true);

    try {
      await createTermGroupMemberRebuildRunRequest(workspaceId, group.id, {
        model,
        includeAlreadyMembers,
        removeNonMatching,
        enableWebResearch,
      });
      toast.add({ title: "Member rebuild started.", type: "success" });
      onOpenChange(false);
      await onStarted();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : "Could not start member rebuild.",
        type: "error",
      });
    } finally {
      setStarting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{TERM_GROUP_CONFIG.rebuildMembersTitle}</DialogTitle>
          <DialogDescription>
            {TERM_GROUP_CONFIG.rebuildMembersDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-rebuild-model">Model</Label>
            <Select
              value={model}
              onValueChange={(value) => {
                setModel(value as ChatModelId);
                setEstimate(null);
              }}
            >
              <SelectTrigger id="member-rebuild-model" className="w-full">
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
              <Label htmlFor="member-rebuild-web-research">
                Web research (Exa)
              </Label>
              <p className="text-xs text-muted-foreground">
                Let the LLM call Exa Answer when a term name is ambiguous and
                needs external context.
              </p>
              {estimate && !estimate.webResearchAvailable ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  EXA_API_KEY is not configured — web research will be skipped.
                </p>
              ) : null}
            </div>
            <Switch
              id="member-rebuild-web-research"
              checked={enableWebResearch}
              onCheckedChange={(checked) => {
                setEnableWebResearch(checked);
                setEstimate(null);
              }}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="member-rebuild-include-members">
                Include current members
              </Label>
              <p className="text-xs text-muted-foreground">
                Re-evaluate terms already in this group. Required to remove
                non-matching members.
              </p>
            </div>
            <Switch
              id="member-rebuild-include-members"
              checked={includeAlreadyMembers}
              disabled={removeNonMatching}
              onCheckedChange={(checked) => {
                setIncludeAlreadyMembers(checked);
                setEstimate(null);
              }}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="member-rebuild-remove-non-matching">
                Remove non-matching members
              </Label>
              <p className="text-xs text-muted-foreground">
                Remove terms from this group when the LLM decides they no longer
                belong.
              </p>
            </div>
            <Switch
              id="member-rebuild-remove-non-matching"
              checked={removeNonMatching}
              onCheckedChange={(checked) => {
                setRemoveNonMatching(checked);
                setEstimate(null);
              }}
            />
          </div>

          {estimate ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Terms to check:</span>{" "}
                {formatNumber(estimate.estimate.termCount)}
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
            disabled={estimating || starting}
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
            disabled={starting || estimating || !estimate}
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
