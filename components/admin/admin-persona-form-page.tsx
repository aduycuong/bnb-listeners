"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import {
  PERSONA_KINDS,
  PERSONA_REVIEW_STATUSES,
  personaFormSchema,
  type PersonaBody,
  type PersonaFormValues,
} from "@/lib/personas/schema";
import type { PersonaRow } from "@/lib/personas/types";

import { adminQueryKeys } from "./admin-query-keys";
import { AdminQueryState } from "./admin-query-state";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";
import { sendAdminJson } from "./send-admin-json";

const KIND_OPTIONS = PERSONA_KINDS.map((value) => ({ value, label: value }));
const REVIEW_OPTIONS = PERSONA_REVIEW_STATUSES.map((value) => ({ value, label: value }));

const NEW_PERSONA: PersonaFormValues = {
  name: "",
  kind: "individual",
  description: "",
  tone: "",
  concerns: "",
  reviewStatus: "approved",
};

function toBody(values: PersonaFormValues): PersonaBody {
  return {
    ...values,
    concerns: values.concerns
      .split(",")
      .map((concern) => concern.trim())
      .filter(Boolean),
  };
}

function PersonaForm({ persona }: { persona?: PersonaRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: persona
      ? {
          name: persona.name,
          kind: persona.kind,
          description: persona.description,
          tone: persona.tone,
          concerns: persona.concerns.join(", "),
          reviewStatus: persona.reviewStatus === "draft" ? "draft" : "approved",
        }
      : NEW_PERSONA,
  });

  const save = useMutation({
    mutationFn: (values: PersonaFormValues) =>
      persona
        ? sendAdminJson<PersonaRow>(`/api/admin/personas/${persona.id}`, "PATCH", toBody(values))
        : sendAdminJson<PersonaRow>("/api/admin/personas", "POST", toBody(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.personas() });
      toast.add({ title: persona ? "Persona updated." : "Persona created.", type: "success" });
      router.push("/admin/personas");
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
    >
      <FieldGroup>
        <FormFieldText control={form.control} name="name" label="Name" placeholder="Nhà đầu tư lướt sóng" />
        <FormFieldSelect control={form.control} name="kind" label="Kind" options={KIND_OPTIONS} />
        <FormFieldTextarea
          control={form.control}
          name="description"
          label="Description"
          description="One or two sentences. The whole persona should stay near 150 prompt tokens."
          rows={3}
        />
        <FormFieldTextarea
          control={form.control}
          name="tone"
          label="Tone"
          description="How this person writes: voice, slang, length, habits."
          rows={2}
        />
        <FormFieldText
          control={form.control}
          name="concerns"
          label="Concerns"
          placeholder="giá, pháp lý, tiến độ"
          description="Aspects this persona cares about, comma separated. Each comment is assigned one of them."
        />
        <FormFieldSelect
          control={form.control}
          name="reviewStatus"
          label="Review status"
          options={REVIEW_OPTIONS}
        />
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          {persona ? "Save changes" : "Create persona"}
        </Button>
        <Link href="/admin/personas" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** Create (no `id`) or edit one persona. */
export function AdminPersonaFormPage({ id }: { id?: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.persona(id ?? "new"),
    queryFn: () => fetchAdminJson<PersonaRow>(`/api/admin/personas/${id}`),
    enabled: !!id,
  });

  return (
    <AdminSection
      title={id ? "Edit persona" : "New persona"}
      description={
        data
          ? `Version ${data.version} · ${data.source} · used in ${data.panelCount} panel(s), ${data.authorCount} author(s).`
          : undefined
      }
    >
      {id && !data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <PersonaForm persona={data} />
      )}
    </AdminSection>
  );
}
