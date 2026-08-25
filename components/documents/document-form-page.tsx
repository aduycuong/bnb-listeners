"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  documentQueryKey,
  documentsQueryKey,
} from "@/components/documents/document-query-keys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { Document } from "@/db/schema";
import {
  DOCUMENT_CONFIG,
  getDocumentHref,
  getEmbeddingStatusBadge,
} from "@/lib/documents/document-config";
import { DOCUMENT_TYPES, documentFormSchema } from "@/lib/documents/schema";
import type { DocumentFormValues } from "@/lib/documents/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentFormPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  mode: "create" | "edit";
  document?: Document;
};

function toDatetimeLocal(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function documentToFormValues(document: Document): DocumentFormValues {
  return {
    docType: document.docType,
    sourceKey: document.sourceKey,
    sourceName: document.sourceName,
    sourceId: document.sourceId,
    title: document.title ?? "",
    rawContent: document.rawContent,
    metadataJson:
      Object.keys(document.metadata ?? {}).length > 0
        ? JSON.stringify(document.metadata, null, 2)
        : "",
    publishedAt: toDatetimeLocal(document.publishedAt),
  };
}

function parseMetadataJson(metadataJson: string) {
  const trimmed = metadataJson.trim();
  if (!trimmed) {
    return undefined;
  }

  return JSON.parse(trimmed) as Record<string, unknown>;
}

function buildDocumentBody(values: DocumentFormValues) {
  const metadata = parseMetadataJson(values.metadataJson);
  const title = values.title.trim() || undefined;
  const publishedAt = values.publishedAt.trim()
    ? new Date(values.publishedAt).toISOString()
    : undefined;

  return {
    docType: values.docType,
    sourceKey: values.sourceKey.trim(),
    sourceName: values.sourceName.trim(),
    sourceId: values.sourceId.trim(),
    title,
    rawContent: values.rawContent,
    metadata,
    publishedAt,
  };
}

export function DocumentFormPage({
  workspace,
  workspaceIndex,
  mode,
  document,
}: DocumentFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = workspace.permission !== "read";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listHref = getDocumentHref(workspaceIndex);

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: document
      ? documentToFormValues(document)
      : {
          docType: "post",
          sourceKey: "",
          sourceName: "",
          sourceId: "",
          title: "",
          rawContent: "",
          metadataJson: "",
          publishedAt: "",
        },
  });

  useEffect(() => {
    if (document) {
      form.reset(documentToFormValues(document));
    }
  }, [document, form]);

  async function onSubmit(values: DocumentFormValues) {
    let body: ReturnType<typeof buildDocumentBody>;

    try {
      body = buildDocumentBody(values);
    } catch {
      toast.add({
        title: "Metadata must be valid JSON.",
        type: "error",
      });
      return;
    }

    const url =
      mode === "create" ? "/api/documents" : `/api/documents/${document?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await workspaceFetch(workspace.id, url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Document & {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save document.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: mode === "create" ? "Document created." : "Document updated.",
      type: "success",
    });

    await queryClient.invalidateQueries({
      queryKey: documentsQueryKey(workspace.id),
    });

    if (mode === "edit" && document) {
      await queryClient.invalidateQueries({
        queryKey: documentQueryKey(workspace.id, document.id),
      });
    }

    if (mode === "create") {
      router.push(getDocumentHref(workspaceIndex, data.id));
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!document) {
      return;
    }

    setDeleting(true);

    try {
      const res = await workspaceFetch(
        workspace.id,
        `/api/documents/${document.id}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not delete document.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: data.message ?? "Document deleted.",
        type: "success",
      });
      setDeleteOpen(false);
      await queryClient.invalidateQueries({
        queryKey: documentsQueryKey(workspace.id),
      });
      router.push(listHref);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const statusBadge =
    mode === "edit" && document
      ? getEmbeddingStatusBadge(document.embeddingStatus)
      : null;

  const title =
    mode === "create"
      ? DOCUMENT_CONFIG.formCreateTitle
      : (document?.title?.trim() ||
          document?.sourceId ||
          DOCUMENT_CONFIG.listTitle);
  const description =
    mode === "create"
      ? DOCUMENT_CONFIG.formCreateDescription
      : DOCUMENT_CONFIG.formEditDescription;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
      <div className="mb-6 space-y-4">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          render={<Link href={listHref} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to documents
        </Button>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {statusBadge ? (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document details</CardTitle>
          <CardDescription>
            Source fields identify the document for deduplication. Content
            changes trigger re-processing.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="mb-6">
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.docType || undefined}>
                <FieldLabel htmlFor="document-doc-type">Document type</FieldLabel>
                <Controller
                  name="docType"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEdit || isSubmitting}
                    >
                      <SelectTrigger
                        id="document-doc-type"
                        className="w-full"
                        aria-invalid={!!form.formState.errors.docType}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((docType) => (
                          <SelectItem key={docType} value={docType}>
                            {docType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.docType]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.sourceName || undefined}>
                <FieldLabel htmlFor="document-source-name">Source name</FieldLabel>
                <Input
                  id="document-source-name"
                  autoComplete="off"
                  placeholder="TechCrunch"
                  aria-invalid={!!form.formState.errors.sourceName}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("sourceName")}
                />
                <FieldDescription>
                  Human-readable label for the content source.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.sourceName]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.sourceKey || undefined}>
                <FieldLabel htmlFor="document-source-key">Source key</FieldLabel>
                <Input
                  id="document-source-key"
                  autoComplete="off"
                  placeholder="techcrunch"
                  aria-invalid={!!form.formState.errors.sourceKey}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("sourceKey")}
                />
                <FieldDescription>
                  Stable platform identifier used with document type for
                  deduplication.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.sourceKey]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.sourceId || undefined}>
                <FieldLabel htmlFor="document-source-id">Source ID</FieldLabel>
                <Input
                  id="document-source-id"
                  autoComplete="off"
                  placeholder="article-123"
                  aria-invalid={!!form.formState.errors.sourceId}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("sourceId")}
                />
                <FieldDescription>
                  External item ID from the source (not a URL).
                </FieldDescription>
                <FieldError errors={[form.formState.errors.sourceId]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.title || undefined}>
                <FieldLabel htmlFor="document-title">Title</FieldLabel>
                <Input
                  id="document-title"
                  autoComplete="off"
                  placeholder="Optional headline"
                  aria-invalid={!!form.formState.errors.title}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("title")}
                />
                <FieldError errors={[form.formState.errors.title]} />
              </Field>

              <Field
                data-invalid={!!form.formState.errors.publishedAt || undefined}
              >
                <FieldLabel htmlFor="document-published-at">
                  Published at
                </FieldLabel>
                <Input
                  id="document-published-at"
                  type="datetime-local"
                  disabled={!canEdit || isSubmitting}
                  {...form.register("publishedAt")}
                />
                <FieldDescription>
                  Optional original publish date from the source.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.publishedAt]} />
              </Field>

              <Field
                data-invalid={!!form.formState.errors.rawContent || undefined}
              >
                <FieldLabel htmlFor="document-raw-content">Content</FieldLabel>
                <Textarea
                  id="document-raw-content"
                  rows={12}
                  placeholder="Paste or write the document content…"
                  aria-invalid={!!form.formState.errors.rawContent}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("rawContent")}
                />
                <FieldError errors={[form.formState.errors.rawContent]} />
              </Field>

              <Field
                data-invalid={!!form.formState.errors.metadataJson || undefined}
              >
                <FieldLabel htmlFor="document-metadata">Metadata (JSON)</FieldLabel>
                <Textarea
                  id="document-metadata"
                  rows={6}
                  placeholder={'{\n  "url": "https://example.com/article"\n}'}
                  aria-invalid={!!form.formState.errors.metadataJson}
                  disabled={!canEdit || isSubmitting}
                  {...form.register("metadataJson")}
                />
                <FieldDescription>
                  Optional JSON object for URLs, author, engagement counts, etc.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.metadataJson]} />
              </Field>
            </FieldGroup>
          </CardContent>

          {canEdit ? (
            <CardFooter className="flex flex-wrap items-center gap-3 border-t">
              {mode === "edit" ? (
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isSubmitting || deleting}
                      />
                    }
                  >
                    Delete document
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the document and its chunks. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={deleting}
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
                          "Delete document"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || deleting}
                className="ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  DOCUMENT_CONFIG.createLabel
                ) : (
                  "Save changes"
                )}
              </Button>
            </CardFooter>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
