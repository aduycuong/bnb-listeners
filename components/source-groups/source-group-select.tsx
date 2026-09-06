"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildSourceGroupSelectItems } from "@/lib/source-groups/source-group-select-config";
import type { SourceGroupListItem } from "@/lib/source-groups/types";

type SourceGroupSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  sourceGroups: SourceGroupListItem[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

export function SourceGroupSelect({
  id,
  value,
  onValueChange,
  sourceGroups,
  disabled = false,
  className,
  placeholder = "Select source group",
  "aria-invalid": ariaInvalid,
}: SourceGroupSelectProps) {
  const items = buildSourceGroupSelectItems(sourceGroups);

  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={className}
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
