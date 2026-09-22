"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { startResearchRunRequest } from "@/components/research/research-request";
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
import {
  getResearchDepthLabel,
  getResearchHref,
  RESEARCH_CONFIG,
} from "@/lib/research/research-config";
import type { Clarification, DepthLevel } from "@/lib/research/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

const researchCreateFormSchema = z.object({
  query: z.string().min(1, { error: "Query is required." }),
  context: z.string().optional(),
  depth: z.enum(["quick", "standard", "deep"]),
  clarificationMode: z.enum(["ask", "assume", "off"]),
});

type ResearchCreateFormValues = z.infer<typeof researchCreateFormSchema>;

type ResearchCreatePageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  initialValues?: Partial<ResearchCreateFormValues>;
};

export function ResearchCreatePage({
  workspace,
  workspaceIndex,
  initialValues,
}: ResearchCreatePageProps) {
  const router = useRouter();
  const listHref = getResearchHref(workspaceIndex);
  const [submitting, setSubmitting] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<
    string[]
  >([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});

  const form = useForm<ResearchCreateFormValues>({
    resolver: zodResolver(researchCreateFormSchema),
    defaultValues: {
      query: initialValues?.query ?? "",
      context: initialValues?.context ?? "",
      depth: initialValues?.depth ?? "standard",
      clarificationMode: initialValues?.clarificationMode ?? "ask",
    },
  });

  async function onSubmit(values: ResearchCreateFormValues) {
    setSubmitting(true);

    try {
      const clarifications: Clarification[] | undefined =
        clarificationQuestions.length > 0
          ? clarificationQuestions.map((question) => ({
              question,
              answer: clarificationAnswers[question]?.trim() ?? "",
            }))
          : undefined;

      if (clarifications?.some((item) => !item.answer)) {
        toast.add({
          title: "Please answer all clarifying questions.",
          type: "error",
        });
        return;
      }

      const result = await startResearchRunRequest(workspace.id, {
        query: values.query.trim(),
        context: values.context?.trim() || undefined,
        depth: values.depth,
        clarificationMode: values.clarificationMode,
        clarifications,
      });

      if (result.status === "needs_clarification") {
        setClarificationQuestions(result.questions);
        setClarificationAnswers(
          Object.fromEntries(result.questions.map((question) => [question, ""])),
        );
        toast.add({
          title: "A few clarifying questions before we start.",
          type: "info",
        });
        return;
      }

      toast.add({ title: "Research started.", type: "success" });
      router.push(getResearchHref(workspaceIndex, result.jobId));
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Could not start research.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={listHref} />}
          className="-ml-2 mb-4"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to research
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {RESEARCH_CONFIG.formTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {RESEARCH_CONFIG.formDescription}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Research request</CardTitle>
            <CardDescription>
              Be specific about what you want to learn and any scope constraints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="query"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="research-query">Query</FieldLabel>
                    <Textarea
                      id="research-query"
                      rows={4}
                      placeholder="What trends are driving engagement in our skincare posts this month?"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldDescription>
                      The main question or goal for this research run.
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="context"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="research-context">
                      Background (optional)
                    </FieldLabel>
                    <Textarea
                      id="research-context"
                      rows={3}
                      placeholder="Audience, timeframe, known findings, or output format preferences."
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="depth"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="research-depth">Depth</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as DepthLevel)
                        }
                      >
                        <SelectTrigger id="research-depth" className="w-full">
                          <SelectValue placeholder="Select depth" />
                        </SelectTrigger>
                        <SelectContent>
                          {(["quick", "standard", "deep"] as const).map(
                            (depth) => (
                              <SelectItem key={depth} value={depth}>
                                {getResearchDepthLabel(depth)}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="clarificationMode"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="research-clarification-mode">
                        Clarifications
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="research-clarification-mode"
                          className="w-full"
                        >
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ask">Ask when unclear</SelectItem>
                          <SelectItem value="assume">Assume and proceed</SelectItem>
                          <SelectItem value="off">Never ask</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              {clarificationQuestions.length > 0 ? (
                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-medium">Clarifying questions</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Answer these so the research can start with the right scope.
                    </p>
                  </div>
                  {clarificationQuestions.map((question) => (
                    <Field key={question}>
                      <FieldLabel htmlFor={`clarify-${question}`}>
                        {question}
                      </FieldLabel>
                      <Input
                        id={`clarify-${question}`}
                        value={clarificationAnswers[question] ?? ""}
                        onChange={(event) =>
                          setClarificationAnswers((current) => ({
                            ...current,
                            [question]: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  ))}
                </div>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href={listHref} />}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  Starting…
                </>
              ) : clarificationQuestions.length > 0 ? (
                "Submit answers"
              ) : (
                "Start research"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
