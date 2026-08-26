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
import { toast } from "@/components/ui/toast";
import type { TopicListItem } from "@/lib/topics/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TopicDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  topic?: TopicListItem;
  onDeleted: () => Promise<void>;
};

export function TopicDeleteDialog({
  open,
  onOpenChange,
  workspaceId,
  topic,
  onDeleted,
}: TopicDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!topic) {
      return;
    }

    setDeleting(true);

    try {
      const res = await workspaceFetch(workspaceId, `/api/topics/${topic.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not delete topic.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: data.message ?? "Topic deleted.",
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
          <AlertDialogTitle>Delete topic?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes {topic ? `“${topic.name}”` : "this topic"} and its
            document assignments. Child topics become top-level. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting || !topic}
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
              "Delete topic"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
