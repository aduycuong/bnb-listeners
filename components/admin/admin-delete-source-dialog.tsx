"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AdminSourceDetail } from "@/lib/admin-console/types";
import type { DeleteSourceResult } from "@/lib/connectors/types";

import { formatNumber } from "./admin-format";
import { adminQueryKeys } from "./admin-query-keys";
import { sendAdminJson } from "./send-admin-json";

/** Delete button of a connector source, with a confirmation listing what goes with it. */
export function AdminDeleteSourceDialog({ source }: { source: AdminSourceDetail }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const busy = source.activeRuns > 0;

  const remove = useMutation({
    mutationFn: () =>
      sendAdminJson<DeleteSourceResult>(`/api/admin/sources/${source.id}`, "DELETE"),
    onSuccess: async (result) => {
      toast.add({
        title: `Source deleted with ${formatNumber(result.deletedContentItems)} content items.`,
        type: "success",
      });
      setOpen(false);
      router.push("/admin/sources");
      // The detail query would refetch into a 404 before the page leaves.
      queryClient.removeQueries({ queryKey: adminQueryKeys.source(source.id) });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        disabled={busy}
        title={busy ? "A collect run is still pending or running." : undefined}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon data-icon="inline-start" />
        Delete source
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!remove.isPending) setOpen(next);
        }}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {source.name ?? source.url ?? "this source"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the source, its {formatNumber(source.posts)} posts and{" "}
              {formatNumber(source.comments)} comments and replies, and with them their mentions,
              labels, engagement history and refresh checkpoints. Collect runs stay, without a
              source, so past usage still counts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {source.projects.length > 0 ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <p className="font-medium">
                Followed by {source.projects.length} project
                {source.projects.length === 1 ? "" : "s"}; it is removed from them and they
                re-match:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {source.projects.map((project) => (
                  <li key={project.id}>{project.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
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
                "Delete source"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
