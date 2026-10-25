"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { projectsQueryKey } from "@/hooks/use-project-route-context";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

/** Confirms deleting a project by typing its name; its config and matched data go with it. */
export function ProjectDeleteDialog({
  open,
  onOpenChange,
  workspaceId,
  project,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  project: { id: string; name: string };
  /** Runs before the project lists refetch, e.g. to leave a page of the deleted project. */
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === project.name.trim();

  const remove = useMutation({
    mutationFn: async () => {
      const res = await projectFetch(workspaceId, project.id, `/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Không xóa được project.");
      }
    },
    onSuccess: async () => {
      toast.add({ title: `Đã xóa project “${project.name}”.`, type: "success" });
      onOpenChange(false);
      onDeleted?.();
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) });
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (remove.isPending) return;
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa project “{project.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Đối tượng theo dõi, khía cạnh, mention đã khớp, cảnh báo và báo cáo của project sẽ bị
            xóa vĩnh viễn. Kho dữ liệu dùng chung và các nguồn vẫn giữ nguyên. Không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (confirmed && !remove.isPending) remove.mutate();
          }}
        >
          <Field>
            <FieldLabel htmlFor="project-delete-confirm">
              <span>
                Gõ <b className="font-semibold">{project.name}</b> để xác nhận
              </span>
            </FieldLabel>
            <Input
              id="project-delete-confirm"
              autoComplete="off"
              value={typed}
              disabled={remove.isPending}
              onChange={(event) => setTyped(event.target.value)}
            />
          </Field>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!confirmed || remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : null}
            Xóa project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
