"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { deleteResearchRunRequest } from "@/components/research/research-request";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";

type ResearchDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  run?: { id: string; query: string };
  onDeleted: () => Promise<void>;
};

export function ResearchDeleteDialog({
  open,
  onOpenChange,
  workspaceId,
  run,
  onDeleted,
}: ResearchDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!run) {
      return;
    }

    setDeleting(true);

    try {
      await deleteResearchRunRequest(workspaceId, run.id);
      toast.add({ title: "Research run deleted.", type: "success" });
      onOpenChange(false);
      await onDeleted();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : "Could not delete research run.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete research run?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes
            {run ? ` “${run.query.slice(0, 120)}${run.query.length > 120 ? "…" : ""}”` : " this run"}
            {" "}and its report. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting || !run}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
