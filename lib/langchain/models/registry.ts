import { z } from "zod";

export const chatModelIds = [
  "gpt-4.1",
  "gpt-4o",
  "gpt-4.1-mini",
] as const;

export type ChatModelId = (typeof chatModelIds)[number];

export const defaultChatModel: ChatModelId = "gpt-4.1";

export const chatModelIdSchema = z.enum(chatModelIds, {
  error: "Select a valid chat model.",
});

export type ChatModelDefinition = {
  label: string;
  modelName: string;
  supportsTemperature: boolean;
  description: string;
};

/**
 * Central registry for LangChain chat models used in bnb-documents.
 * Only OpenAI is installed (@langchain/openai). To add Anthropic or DeepSeek,
 * install the package and extend this registry.
 */
export const chatModelRegistry: Record<ChatModelId, ChatModelDefinition> = {
  "gpt-4.1": {
    label: "GPT-4.1",
    modelName: "gpt-4.1",
    supportsTemperature: true,
    description:
      "Balanced OpenAI model for scoring, classification, and analysis. ~$2/MTok input, ~$8/MTok output.",
  },
  "gpt-4o": {
    label: "GPT-4o",
    modelName: "gpt-4o",
    supportsTemperature: true,
    description:
      "Legacy OpenAI multimodal model for general tasks. ~$2.50/MTok input, ~$10/MTok output.",
  },
  "gpt-4.1-mini": {
    label: "GPT-4.1 Mini",
    modelName: "gpt-4.1-mini",
    supportsTemperature: true,
    description:
      "Cost-efficient model for high-volume tasks. ~$0.40/MTok input, ~$1.60/MTok output.",
  },
};

export function getChatModelDefinition(
  model: ChatModelId,
): ChatModelDefinition {
  return chatModelRegistry[model];
}

export function parseChatModel(
  value: string | undefined,
  fallback: ChatModelId = defaultChatModel,
): ChatModelId {
  const trimmed = value?.trim();
  if (trimmed && trimmed in chatModelRegistry) {
    return trimmed as ChatModelId;
  }

  return fallback;
}
