"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TopicCustomPeriodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate?: string;
  endDate?: string;
  onApply: (range: { startDate: string; endDate: string }) => void;
};

export function TopicCustomPeriodDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  onApply,
}: TopicCustomPeriodDialogProps) {
  const [draftStartDate, setDraftStartDate] = useState(startDate ?? "");
  const [draftEndDate, setDraftEndDate] = useState(endDate ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftStartDate(startDate ?? "");
    setDraftEndDate(endDate ?? "");
    setErrorMessage(null);
  }, [endDate, open, startDate]);

  function handleApply() {
    if (!draftStartDate || !draftEndDate) {
      setErrorMessage("Choose both a start date and an end date.");
      return;
    }

    if (draftStartDate > draftEndDate) {
      setErrorMessage("Start date must be on or before the end date.");
      return;
    }

    onApply({
      startDate: draftStartDate,
      endDate: draftEndDate,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Custom date range</DialogTitle>
          <DialogDescription>
            Choose the period used to calculate document count, quality, and
            trend metrics.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="topic-period-start">Start date</FieldLabel>
            <Input
              id="topic-period-start"
              type="date"
              value={draftStartDate}
              onChange={(event) => setDraftStartDate(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="topic-period-end">End date</FieldLabel>
            <Input
              id="topic-period-end"
              type="date"
              value={draftEndDate}
              onChange={(event) => setDraftEndDate(event.target.value)}
            />
          </Field>
        </FieldGroup>

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply range
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
