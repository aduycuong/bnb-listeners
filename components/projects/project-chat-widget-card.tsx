"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { projectsQueryKey } from "@/hooks/use-project-route-context";
import { projectChatWidgetSchema } from "@/lib/projects/schema";
import type { ProjectListItem } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

/** Public key and on/off of the BNB chat widget shown on this project's pages only. */
export function ProjectChatWidgetCard({
  workspace,
  project,
}: {
  workspace: WorkspaceListItem;
  project: ProjectListItem;
}) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(project.chatWidget.enabled);
  const [publicKey, setPublicKey] = useState(project.chatWidget.publicKey);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");
  const dirty =
    enabled !== project.chatWidget.enabled || publicKey.trim() !== project.chatWidget.publicKey;

  async function save() {
    const parsed = projectChatWidgetSchema.safeParse({ enabled, publicKey });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await projectFetch(workspace.id, project.id, `/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatWidget: parsed.data }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        toast.add({ title: data.message ?? data.error ?? "Không lưu được.", type: "error" });
        return;
      }
      toast.add({ title: "Đã lưu chat widget.", type: "success" });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspace.id) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>BNB Chat widget</CardTitle>
        <CardDescription>
          Chèn khung chat vào các trang của {project.name} để hỏi đáp với AI ngay trên trang. Khung
          chat chỉ hiện ở project này.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Switch
            id="chat-widget-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!canEdit || saving}
          />
          <Label htmlFor="chat-widget-enabled">Bật chat widget</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chat-widget-key">Public key</Label>
          <Input
            id="chat-widget-key"
            value={publicKey}
            onChange={(event) => setPublicKey(event.target.value)}
            placeholder="Public key của BNB chat widget"
            autoComplete="off"
            disabled={!canEdit || saving}
            aria-invalid={error ? true : undefined}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        {canEdit ? (
          <div>
            <Button type="button" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              Lưu
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
