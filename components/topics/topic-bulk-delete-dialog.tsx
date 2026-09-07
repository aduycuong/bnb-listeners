"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { bulkDeleteTopicsRequest } from "@/components/topics/bulk-delete-topics-request";
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

const MAX_LISTED_NAMES = 5;

type TopicBulkDeleteItem = {
  id: string;
  name: string;
};

type TopicBulkDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  topics: TopicBulkDeleteItem[];
  onDeleted: (deletedIds: string[]) => Promise<void>;
};

export function TopicBulkDeleteDialog({
  open,
  onOpenChange,
  workspaceId,
  topics,
  onDeleted,
}: TopicBulkDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const count = topics.length;
  const listedTopics = topics.slice(0, MAX_LISTED_NAMES);
  const remainingCount = Math.max(0, count - MAX_LISTED_NAMES);

  async function handleDelete() {
    if (topics.length === 0) {
      return;
    }

    setDeleting(true);

    try {
      const result = await bulkDeleteTopicsRequest(
        workspaceId,
        topics.map((topic) => topic.id),
      );

      if (!result.ok || !result.data) {
        toast.add({
          title: result.message ?? "Could not delete topics.",
          type: "error",
        });
        return;
      }

      const { deletedIds, failures, message } = result.data;

      if (deletedIds.length > 0) {
        await onDeleted(deletedIds);
      }

      if (failures.length === 0) {
        toast.add({
          title: message,
          type: "success",
        });
        onOpenChange(false);
        return;
      }

      if (deletedIds.length > 0) {
        const nameById = new Map(topics.map((topic) => [topic.id, topic.name]));
        toast.add({
          title: message,
          description: failures
            .slice(0, 3)
            .map(
              (failure) =>
                `${nameById.get(failure.id) ?? failure.id}: ${failure.message}`,
            )
            .join(" "),
          type: "warning",
        });
        onOpenChange(false);
        return;
      }

      toast.add({
        title: message,
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!deleting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} topic{count === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the selected topic{count === 1 ? "" : "s"} and their
            document assignments. This cannot be undone.
          </AlertDialogDescription>
          {count > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {listedTopics.map((topic) => (
                <li key={topic.id}>{topic.name}</li>
              ))}
              {remainingCount > 0 ? <li>and {remainingCount} more</li> : null}
            </ul>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting || count === 0}
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
              `Delete ${count} topic${count === 1 ? "" : "s"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
