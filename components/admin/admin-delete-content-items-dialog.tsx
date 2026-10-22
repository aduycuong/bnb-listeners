"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";

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
import type { DeleteContentItemsResult } from "@/lib/raw-store/types";

import { sendAdminJson } from "./send-admin-json";

export function AdminDeleteContentItemsDialog({
  open,
  onOpenChange,
  ids,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onDeleted?: (result: DeleteContentItemsResult) => void;
}) {
  const queryClient = useQueryClient();
  const count = ids.length;

  const remove = useMutation({
    mutationFn: () =>
      sendAdminJson<DeleteContentItemsResult>("/api/admin/content-items/delete", "POST", {
        ids,
      }),
    onSuccess: async (result) => {
      const thread =
        result.descendants > 0
          ? ` ${result.descendants} comment${result.descendants === 1 ? "" : "s"} and replies under them were removed too.`
          : "";
      toast.add({
        title:
          result.deleted === 0
            ? "Those content items are already gone."
            : `Deleted ${result.deleted} content item${result.deleted === 1 ? "" : "s"}.${thread}`,
        type: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onDeleted?.(result);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!remove.isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} content item{count === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the selected records and every comment or reply under them. Mentions,
            labels, engagement snapshots and refresh schedules for those rows are removed with
            them. Authors, sources and collect runs stay. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending || count === 0}
            onClick={(event) => {
              event.preventDefault();
              remove.mutate();
            }}
          >
            {remove.isPending ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Deleting…
              </>
            ) : (
              `Delete ${count}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
