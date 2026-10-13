"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

/** Select for a list filter; the empty value means "all". */
export function AdminFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[] | { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const items = [
    { value: ALL, label: `All ${label}` },
    ...options.map((option) =>
      typeof option === "string" ? { value: option, label: option } : option,
    ),
  ];

  return (
    <Select
      items={items}
      value={value || ALL}
      onValueChange={(next) => onChange(!next || next === ALL ? "" : String(next))}
    >
      <SelectTrigger size="sm" className="min-w-36" aria-label={label}>
        <SelectValue />
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
