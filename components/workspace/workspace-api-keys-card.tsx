"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CopyIcon, KeyRoundIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";
import type {
  CreateWorkspaceKeyResult,
  ListWorkspaceKeysResult,
  WorkspaceApiKeyItem,
} from "@/lib/unkey/types";

const createKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Max 64 characters"),
});

type CreateKeyValues = z.infer<typeof createKeySchema>;

type WorkspaceApiKeysCardProps = {
  workspace: WorkspaceListItem;
};

const keysQueryKey = (workspaceId: string) => ["workspace-api-keys", workspaceId];

async function fetchKeys(workspaceId: string): Promise<ListWorkspaceKeysResult> {
  const res = await workspaceFetch(workspaceId, "/api/workspace-keys");
  const data = (await res.json()) as ListWorkspaceKeysResult & {
    error?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Could not load API keys.");
  return data;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
}

type NewKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCreated: () => void;
};

function NewKeyDialog({ open, onOpenChange, workspaceId, onCreated }: NewKeyDialogProps) {
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateKeyValues>({
    resolver: zodResolver(createKeySchema),
    defaultValues: { name: "" },
  });

  const isSubmitting = form.formState.isSubmitting;
  const nameError = form.formState.errors.name;

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setCreatedKey(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CreateKeyValues) {
    const res = await workspaceFetch(workspaceId, "/api/workspace-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as CreateWorkspaceKeyResult & {
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      toast.add({ title: data.message ?? data.error ?? "Could not create key.", type: "error" });
      return;
    }

    setCreatedKey(data.rawKey);
    onCreated();
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={!isSubmitting}>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>
                Copy your key now — it will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm">{createdKey}</code>
              <Button variant="ghost" size="icon-sm" onClick={copyKey} aria-label="Copy key">
                {copied ? (
                  <CheckIcon className="size-4 text-green-600" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Use this key in the{" "}
              <code className="text-xs">Authorization: Bearer &lt;key&gt;</code> header when
              connecting to <code className="text-xs">/api/mcp/search</code>.
            </p>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give this key a name to identify its use (e.g. "Claude Desktop", "n8n prod").
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-4">
              <Field data-invalid={!!nameError || undefined}>
                <FieldLabel htmlFor="api-key-name">Name</FieldLabel>
                <Input
                  id="api-key-name"
                  autoComplete="off"
                  placeholder="e.g. Claude Desktop"
                  aria-invalid={!!nameError}
                  disabled={isSubmitting}
                  {...form.register("name")}
                />
                <FieldError errors={[nameError]} />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="animate-spin" data-icon="inline-start" />
                    Creating…
                  </>
                ) : (
                  "Create key"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type KeyToRevoke = Pick<WorkspaceApiKeyItem, "id" | "name">;

export function WorkspaceApiKeysCard({ workspace }: WorkspaceApiKeysCardProps) {
  const queryClient = useQueryClient();
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<KeyToRevoke | null>(null);
  const [revoking, setRevoking] = useState(false);

  const isEditor =
    workspace.permission === "owner" || workspace.permission === "edit";

  const { data, isLoading, error } = useQuery({
    queryKey: keysQueryKey(workspace.id),
    queryFn: () => fetchKeys(workspace.id),
  });

  const keys = data?.items ?? [];

  async function refreshKeys() {
    await queryClient.invalidateQueries({ queryKey: keysQueryKey(workspace.id) });
  }

  async function handleRevoke() {
    if (!keyToRevoke) return;
    setRevoking(true);

    try {
      const res = await workspaceFetch(
        workspace.id,
        `/api/workspace-keys/${keyToRevoke.id}`,
        { method: "DELETE" },
      );
      const responseData = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: responseData.error ?? responseData.message ?? "Could not revoke key.",
          type: "error",
        });
        return;
      }

      toast.add({ title: responseData.message ?? "API key revoked.", type: "success" });
      setKeyToRevoke(null);
      await refreshKeys();
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Keys for external agents to access this workspace via{" "}
              <code className="text-xs">/api/mcp/search</code>.
              Rate-limited to 100 requests/minute per key.
            </CardDescription>
          </div>
          {isEditor ? (
            <Button className="shrink-0" onClick={() => setNewKeyOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create key
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
              <p className="text-sm">
                No API keys yet. Create one to connect external agents.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{key.keyStart}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </span>
                    {isEditor ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Revoke ${key.name}`}
                        onClick={() => setKeyToRevoke({ id: key.id, name: key.name })}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <NewKeyDialog
        open={newKeyOpen}
        onOpenChange={setNewKeyOpen}
        workspaceId={workspace.id}
        onCreated={refreshKeys}
      />

      <AlertDialog
        open={keyToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setKeyToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {keyToRevoke ? (
                <>
                  <span className="font-medium text-foreground">{keyToRevoke.name}</span> will be
                  permanently revoked. Any agent using this key will lose access immediately.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revoking}
              onClick={handleRevoke}
            >
              {revoking ? (
                <>
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  Revoking…
                </>
              ) : (
                "Revoke key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
