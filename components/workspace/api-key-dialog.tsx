"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { ProjectListItem } from "@/lib/projects/types";
import { API_KEY_SCOPE_LABELS, API_KEY_SCOPES } from "@/lib/unkey/constants";
import { workspaceKeyBodySchema, type WorkspaceKeyBody } from "@/lib/unkey/schema";
import type { CreateWorkspaceKeyResult, WorkspaceApiKeyItem } from "@/lib/unkey/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type ApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projects: ProjectListItem[];
  /** The key to edit; a new key when null. */
  editing: WorkspaceApiKeyItem | null;
  /** Values of a new key. */
  defaults?: WorkspaceKeyBody;
  onSaved: () => void;
};

const EMPTY_VALUES: WorkspaceKeyBody = {
  name: "",
  scopes: ["reports:read", "mentions:read"],
  projectIds: null,
};

export function mcpEndpointUrl() {
  return typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;
}

/** Creates a workspace API key, or edits the name, scopes and projects of one (D27). */
export function ApiKeyDialog({
  open,
  onOpenChange,
  workspaceId,
  projects,
  editing,
  defaults,
  onSaved,
}: ApiKeyDialogProps) {
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<WorkspaceKeyBody>({
    resolver: zodResolver(workspaceKeyBodySchema),
    defaultValues: EMPTY_VALUES,
  });
  const isSubmitting = form.formState.isSubmitting;
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? { name: editing.name, scopes: editing.scopes, projectIds: editing.projectIds }
        : (defaults ?? EMPTY_VALUES),
    );
  }, [open, editing, defaults, form]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setCreatedKey(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: WorkspaceKeyBody) {
    const res = await workspaceFetch(
      workspaceId,
      editing ? `/api/workspace-keys/${editing.id}` : "/api/workspace-keys",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const data = (await res.json()) as Partial<CreateWorkspaceKeyResult> & {
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      toast.add({ title: data.message ?? data.error ?? "Không lưu được key.", type: "error" });
      return;
    }

    onSaved();
    if (editing) {
      toast.add({ title: data.message ?? "Đã lưu key.", type: "success" });
      handleClose(false);
    } else {
      setCreatedKey(data.rawKey ?? null);
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={!isSubmitting} className="sm:max-w-lg">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Đã tạo API key</DialogTitle>
              <DialogDescription>Sao chép key ngay, key sẽ không hiện lại.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm">{createdKey}</code>
              <Button variant="ghost" size="icon-sm" onClick={copyKey} aria-label="Sao chép key">
                {copied ? (
                  <CheckIcon className="size-4 text-green-600" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Gửi key trong header <code className="text-xs">Authorization: Bearer &lt;key&gt;</code>{" "}
              khi kết nối tới <code className="text-xs break-all">{mcpEndpointUrl()}</code>.
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Xong</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa API key" : "Tạo API key"}</DialogTitle>
              <DialogDescription>
                Key cho agent bên ngoài (Claude, chat agent, n8n…) đọc dữ liệu qua MCP. Agent
                chạy với quyền của người tạo key và dừng khi người đó rời workspace.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-4">
              <Field data-invalid={!!errors.name || undefined}>
                <FieldLabel htmlFor="api-key-name">Tên</FieldLabel>
                <Input
                  id="api-key-name"
                  autoComplete="off"
                  placeholder="VD: Claude Desktop, chat agent"
                  aria-invalid={!!errors.name}
                  disabled={isSubmitting}
                  {...form.register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Controller
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FieldSet data-invalid={!!errors.scopes || undefined}>
                    <FieldLegend variant="label">Quyền</FieldLegend>
                    {API_KEY_SCOPES.map((scope) => {
                      return (
                        <Field key={scope} orientation="horizontal">
                          <Switch
                            id={`api-key-scope-${scope}`}
                            checked={field.value.includes(scope)}
                            disabled={isSubmitting}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked
                                  ? API_KEY_SCOPES.filter((s) => s === scope || field.value.includes(s))
                                  : field.value.filter((s) => s !== scope),
                              )
                            }
                          />
                          <FieldContent>
                            <FieldLabel htmlFor={`api-key-scope-${scope}`}>
                              {API_KEY_SCOPE_LABELS[scope].label}
                            </FieldLabel>
                            <FieldDescription>{API_KEY_SCOPE_LABELS[scope].description}</FieldDescription>
                          </FieldContent>
                        </Field>
                      );
                    })}
                    <FieldError errors={[errors.scopes]} />
                  </FieldSet>
                )}
              />

              <Controller
                control={form.control}
                name="projectIds"
                render={({ field }) => (
                  <FieldSet data-invalid={!!errors.projectIds || undefined}>
                    <FieldLegend variant="label">Project được dùng</FieldLegend>
                    <RadioGroup
                      value={field.value === null ? "all" : "selected"}
                      onValueChange={(value) => field.onChange(value === "all" ? null : [])}
                      disabled={isSubmitting}
                    >
                      <Field orientation="horizontal">
                        <RadioGroupItem value="all" id="api-key-projects-all" />
                        <FieldLabel htmlFor="api-key-projects-all">
                          Mọi project của workspace, kể cả project tạo sau
                        </FieldLabel>
                      </Field>
                      <Field orientation="horizontal">
                        <RadioGroupItem value="selected" id="api-key-projects-selected" />
                        <FieldLabel htmlFor="api-key-projects-selected">Chỉ các project chọn</FieldLabel>
                      </Field>
                    </RadioGroup>
                    {field.value !== null ? (
                      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                        {projects.map((project) => {
                          const selected = field.value ?? [];
                          return (
                            <Field key={project.id} orientation="horizontal">
                              <Switch
                                id={`api-key-project-${project.id}`}
                                checked={selected.includes(project.id)}
                                disabled={isSubmitting}
                                onCheckedChange={(checked) =>
                                  field.onChange(
                                    checked
                                      ? [...selected, project.id]
                                      : selected.filter((id) => id !== project.id),
                                  )
                                }
                              />
                              <FieldLabel htmlFor={`api-key-project-${project.id}`}>
                                {project.name}
                              </FieldLabel>
                            </Field>
                          );
                        })}
                      </div>
                    ) : null}
                    <FieldError errors={[errors.projectIds]} />
                  </FieldSet>
                )}
              />
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleClose(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
                {editing ? "Lưu" : "Tạo key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
