"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { MentionFilterSelect } from "@/components/mentions/mention-filter-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { REPORT_PERIOD_TYPES } from "@/lib/metrics/config";
import type { ReportPeriod } from "@/lib/metrics/types";

const PERIOD_TYPE_LABELS: Record<(typeof REPORT_PERIOD_TYPES)[number], string> = {
  day: "Ngày",
  week: "Tuần (thứ 2 – chủ nhật)",
  month: "Tháng",
  quarter: "Quý",
  year: "Năm",
};

const generateReportFormSchema = z.object({
  type: z.enum(REPORT_PERIOD_TYPES),
  date: z.iso.date({ error: "Chọn một ngày." }),
});

type GenerateReportFormValues = z.infer<typeof generateReportFormSchema>;

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

/** Picks a calendar period for a new report: the period of that type holding the chosen day. */
export function GenerateReportDialog({
  open,
  onOpenChange,
  pending,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onGenerate: (period: ReportPeriod) => Promise<void>;
}) {
  const form = useForm<GenerateReportFormValues>({
    resolver: zodResolver(generateReportFormSchema),
    defaultValues: { type: "week", date: todayKey() },
  });
  const dateError = form.formState.errors.date;

  useEffect(() => {
    if (open) form.reset({ type: "week", date: todayKey() });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? null : onOpenChange(next))}>
      <DialogContent showCloseButton={!pending}>
        <form onSubmit={form.handleSubmit((values) => onGenerate(values))} noValidate>
          <DialogHeader>
            <DialogTitle>Tạo báo cáo AI</DialogTitle>
            <DialogDescription>
              Báo cáo cho kỳ chứa ngày chọn, theo múi giờ của project. Kỳ chưa kết thúc tính đến hôm
              nay. Báo cáo cùng kỳ đã có sẽ được tạo lại. Mất khoảng 10 giây.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Loại kỳ</FieldLabel>
                  <MentionFilterSelect
                    label="Loại kỳ"
                    value={field.value}
                    options={REPORT_PERIOD_TYPES.map((type) => ({
                      value: type,
                      label: PERIOD_TYPE_LABELS[type],
                    }))}
                    onChange={field.onChange}
                  />
                </Field>
              )}
            />
            <Field data-invalid={!!dateError || undefined}>
              <FieldLabel htmlFor="report-date">Ngày trong kỳ</FieldLabel>
              <Input
                id="report-date"
                type="date"
                max={todayKey()}
                aria-invalid={!!dateError}
                disabled={pending}
                {...form.register("date")}
              />
              <FieldDescription>VD: chọn 20/10 với loại Tuần là tuần 19/10 – 25/10.</FieldDescription>
              <FieldError errors={[dateError]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
              {pending ? "Đang tạo…" : "Tạo báo cáo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
