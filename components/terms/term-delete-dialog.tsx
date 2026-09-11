"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

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
import { deleteTermRequest } from "@/components/terms/delete-term-request";
import { toast } from "@/components/ui/toast";
import type { TermListItem } from "@/lib/terms/types";

type TermDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  term?: Pick<TermListItem, "id" | "name">;
  onDeleted: () => Promise<void>;
};

export function TermDeleteDialog({
  open,
  onOpenChange,
  workspaceId,
  term,
  onDeleted,
}: TermDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!term) {
      return;
    }

    setDeleting(true);

    try {
      const result = await deleteTermRequest(workspaceId, term.id);

      if (!result.ok) {
        toast.add({
          title: result.message ?? "Could not delete term.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: result.message ?? "Term deleted.",
        type: "success",
      });
      onOpenChange(false);
      await onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete term?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes {term ? `“${term.name}”` : "this term"} and its
            document assignments. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting || !term}
            onClick={handleDelete}
          >
            {deleting ? (
              <>
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
                Deleting…
              </>
            ) : (
              "Delete term"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
