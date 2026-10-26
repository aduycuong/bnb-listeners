"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRoundIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ApiKeyDialog } from "@/components/workspace/api-key-dialog";
import { fetchProjects, projectsQueryKey } from "@/hooks/use-project-route-context";
import { useWorkspaceKeys } from "@/hooks/use-workspace-keys";
import type { ProjectListItem } from "@/lib/projects/types";
import { API_KEY_SCOPE_LABELS, PROJECT_KEY_SCOPES } from "@/lib/unkey/constants";
import type { WorkspaceKeyBody } from "@/lib/unkey/schema";
import type { WorkspaceApiKeyItem } from "@/lib/unkey/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type WorkspaceApiKeysCardProps = {
  workspace: WorkspaceListItem;
  /** On a project's "Kết nối AI" page: only keys that can use the project; new keys default to it. */
  project?: ProjectListItem;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(iso));
}

function projectScopeLabel(key: WorkspaceApiKeyItem, projectNames: Map<string, string>) {
  if (!key.projectIds) return "Mọi project";
  const names = key.projectIds.map((id) => projectNames.get(id)).filter(Boolean);
  const missing = key.projectIds.length - names.length;
  return [...names, ...(missing ? [`${missing} project đã xóa`] : [])].join(", ");
}

/** API keys of a workspace for MCP (D27): list, create, edit scopes and projects, revoke. */
export function WorkspaceApiKeysCard({ workspace, project }: WorkspaceApiKeysCardProps) {
  const { keys: allKeys, isLoading, error, refresh } = useWorkspaceKeys(workspace.id);
  const { data: projectData } = useQuery({
    queryKey: projectsQueryKey(workspace.id),
    queryFn: () => fetchProjects(workspace.id),
  });
  const projects = useMemo(() => projectData?.items ?? [], [projectData]);
  const projectNames = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceApiKeyItem | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<WorkspaceApiKeyItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  const isEditor = hasMinWorkspacePermission(workspace.permission, "edit");
  const keys = project
    ? allKeys.filter((key) => !key.projectIds || key.projectIds.includes(project.id))
    : allKeys;
  const defaults = useMemo<WorkspaceKeyBody | undefined>(
    () =>
      project
        ? { name: `${project.name} · chỉ đọc`, scopes: PROJECT_KEY_SCOPES, projectIds: [project.id] }
        : undefined,
    [project],
  );

  function openDialog(key: WorkspaceApiKeyItem | null) {
    setEditing(key);
    setDialogOpen(true);
  }

  async function handleRevoke() {
    if (!keyToRevoke) return;
    setRevoking(true);
    try {
      const res = await workspaceFetch(workspace.id, `/api/workspace-keys/${keyToRevoke.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        toast.add({ title: data.message ?? data.error ?? "Không thu hồi được key.", type: "error" });
        return;
      }
      toast.add({ title: "Đã thu hồi key.", type: "success" });
      setKeyToRevoke(null);
      await refresh();
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{project ? "Key dùng được cho project này" : "API keys"}</CardTitle>
            <CardDescription>
              Key cho agent bên ngoài đọc dữ liệu qua MCP (<code className="text-xs">/api/mcp</code>
              ). Mỗi key giới hạn 100 request/phút.
            </CardDescription>
          </div>
          {isEditor ? (
            <Button className="shrink-0" onClick={() => openDialog(null)}>
              <PlusIcon data-icon="inline-start" />
              {project ? "Tạo key chỉ đọc" : "Tạo key"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error?.message ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
              <KeyRoundIcon className="size-8 opacity-40" />
              <p className="text-sm">Chưa có key. Tạo một key để kết nối agent.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((key) => (
                <li key={key.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{key.keyStart}</p>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary">
                          {API_KEY_SCOPE_LABELS[scope].label}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="max-w-full truncate">
                        {projectScopeLabel(key, projectNames)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {key.createdByName ? `Tạo bởi ${key.createdByName}` : "Key cũ, chạy với quyền chủ workspace"}
                      {" · "}
                      {formatDate(key.createdAt)}
                    </p>
                  </div>
                  {isEditor ? (
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Sửa ${key.name}`}
                        onClick={() => openDialog(key)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Thu hồi ${key.name}`}
                        onClick={() => setKeyToRevoke(key)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspace.id}
        projects={projects}
        editing={editing}
        defaults={defaults}
        onSaved={() => void refresh()}
      />

      <AlertDialog
        open={keyToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setKeyToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {keyToRevoke ? (
                <>
                  <span className="font-medium text-foreground">{keyToRevoke.name}</span> sẽ bị
                  thu hồi vĩnh viễn. Agent đang dùng key này mất quyền truy cập ngay.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={revoking} onClick={handleRevoke}>
              {revoking ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
              Thu hồi key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
