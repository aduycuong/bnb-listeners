"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { panelBodySchema, type PanelBody } from "@/lib/personas/schema";
import type { PanelDetail, PersonaRow } from "@/lib/personas/types";

import { adminQueryKeys } from "./admin-query-keys";
import { AdminQueryState } from "./admin-query-state";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";
import { sendAdminJson } from "./send-admin-json";

const EMPTY_MEMBER = { personaId: "", weight: 1 };

function PanelForm({ panel, personas }: { panel?: PanelDetail; personas: PersonaRow[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<PanelBody>({
    resolver: zodResolver(panelBodySchema),
    defaultValues: panel
      ? {
          name: panel.name,
          description: panel.description,
          members: panel.members.map((member) => ({
            personaId: member.personaId,
            weight: member.weight,
          })),
        }
      : { name: "", description: "", members: [EMPTY_MEMBER] },
  });

  const members = useFieldArray({ control: form.control, name: "members" });
  const watched = useWatch({ control: form.control, name: "members" });
  const totalWeight = watched.reduce(
    (sum, member) => sum + (Number.isFinite(member.weight) ? member.weight : 0),
    0,
  );

  const personaOptions = personas.map((persona) => ({
    value: persona.id,
    label: persona.name,
  }));

  const save = useMutation({
    mutationFn: (values: PanelBody) =>
      panel
        ? sendAdminJson<PanelDetail>(`/api/admin/persona-panels/${panel.id}`, "PATCH", values)
        : sendAdminJson<PanelDetail>("/api/admin/persona-panels", "POST", values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.panels() });
      toast.add({ title: panel ? "Panel updated." : "Panel created.", type: "success" });
      router.push("/admin/panels");
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  const membersError = form.formState.errors.members;

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
    >
      <FieldGroup>
        <FormFieldText control={form.control} name="name" label="Name" placeholder="Group review bất động sản" />
        <FormFieldTextarea control={form.control} name="description" label="Description" rows={2} />

        <FieldSet>
          <FieldLegend variant="label">Personas and weights</FieldLegend>
          <p className="text-xs text-muted-foreground">
            Weights are relative: 15 and 30 mean the second persona writes twice as often. Share is
            computed from the total.
          </p>

          <div className="space-y-3">
            {members.fields.map((item, index) => {
              const weight = watched[index]?.weight;
              const share =
                totalWeight > 0 && Number.isFinite(weight)
                  ? `${Math.round((weight / totalWeight) * 100)}%`
                  : "—";

              return (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <FormFieldSelect
                      control={form.control}
                      name={`members.${index}.personaId`}
                      label={`Persona ${index + 1}`}
                      hideLabel
                      options={personaOptions}
                      placeholder="Pick a persona"
                    />
                  </div>
                  <div className="w-28">
                    <FormFieldText
                      control={form.control}
                      name={`members.${index}.weight`}
                      label={`Weight ${index + 1}`}
                      type="number"
                    />
                  </div>
                  <span className="w-12 pt-8 text-right text-xs tabular-nums text-muted-foreground">
                    {share}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    aria-label="Remove persona"
                    disabled={members.fields.length === 1}
                    onClick={() => members.remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              );
            })}
          </div>

          {membersError?.message ? <FieldError errors={[membersError]} /> : null}
          {membersError?.root?.message ? <FieldError errors={[membersError.root]} /> : null}

          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => members.append(EMPTY_MEMBER)}>
              <PlusIcon data-icon="inline-start" />
              Add persona
            </Button>
          </div>
        </FieldSet>
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          {panel ? "Save changes" : "Create panel"}
        </Button>
        <Link href="/admin/panels" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** Create (no `id`) or edit one panel. */
export function AdminPanelFormPage({ id }: { id?: string }) {
  const personas = useQuery({
    queryKey: adminQueryKeys.personas(),
    queryFn: () => fetchAdminJson<{ items: PersonaRow[] }>("/api/admin/personas"),
  });
  const panel = useQuery({
    queryKey: adminQueryKeys.panel(id ?? "new"),
    queryFn: () => fetchAdminJson<PanelDetail>(`/api/admin/persona-panels/${id}`),
    enabled: !!id,
  });

  const ready = personas.data && (!id || panel.data);

  return (
    <AdminSection title={id ? "Edit panel" : "New panel"}>
      {!ready ? (
        <AdminQueryState
          isPending={personas.isPending || panel.isPending}
          error={personas.error ?? panel.error}
        />
      ) : (
        <PanelForm panel={panel.data} personas={personas.data!.items} />
      )}
    </AdminSection>
  );
}
