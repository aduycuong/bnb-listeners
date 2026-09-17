"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  chatModelGroups,
  chatModelRegistry,
  type ChatModelId,
} from "@/lib/langchain";

type ChatModelSelectProps = {
  id: string;
  value: ChatModelId;
  onValueChange: (value: ChatModelId) => void;
};

export function ChatModelSelect({
  id,
  value,
  onValueChange,
}: ChatModelSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as ChatModelId)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {chatModelGroups.map((group) => (
          <SelectGroup key={group.provider}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.modelIds.map((modelId) => (
              <SelectItem key={modelId} value={modelId}>
                {chatModelRegistry[modelId].label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
