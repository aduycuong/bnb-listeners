import { z } from "zod";

export const chatModelProviders = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  // "alibaba",
] as const;

// export type ChatModelProvider = (typeof chatModelProviders)[number];
export type ChatModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "alibaba";

/** Keep OpenAI / Anthropic / DeepSeek ids aligned with bnb-chat-agent. */
export const chatModelIds = [
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-4.1",
  "gpt-4o",
  "o3-mini",
  "gpt-4.1-mini",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.6-pro",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "qwen-turbo",
  "qwen-plus",
  "qwen-max",
  "qwen-flash",
  "qwen-long",
  "qwen3-max",
] as const;

export type ChatModelId = (typeof chatModelIds)[number];

export const defaultChatModel: ChatModelId = "gpt-4.1";

export const chatModelIdSchema = z.enum(chatModelIds, {
  error: "Select a valid chat model.",
});

export type ChatModelPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
};

export type ChatModelDefinition = {
  label: string;
  modelName: string;
  provider: ChatModelProvider;
  supportsTemperature: boolean;
  description: string;
  pricing: ChatModelPricing;
};

const providerLabels: Record<ChatModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Claude (Anthropic)",
  google: "Gemini (Google)",
  deepseek: "DeepSeek",
  alibaba: "Qwen (Alibaba DashScope)",
};

/**
 * Central registry for LangChain chat models used in bnb-listeners.
 * OpenAI / Anthropic / DeepSeek entries mirror bnb-chat-agent; Qwen is
 * listeners-only for term backfill via DashScope.
 */
export const chatModelRegistry: Record<ChatModelId, ChatModelDefinition> = {
  "gpt-5.5": {
    label: "GPT-5.5",
    modelName: "gpt-5.5",
    provider: "openai",
    supportsTemperature: false,
    description:
      "OpenAI frontier reasoning model for complex analysis and tool use.",
    pricing: { inputPerMTok: 5, outputPerMTok: 30 },
  },
  "gpt-5.5-pro": {
    label: "GPT-5.5 Pro",
    modelName: "gpt-5.5-pro",
    provider: "openai",
    supportsTemperature: false,
    description: "OpenAI maximum-capability reasoning model.",
    pricing: { inputPerMTok: 30, outputPerMTok: 180 },
  },
  "gpt-4.1": {
    label: "GPT-4.1",
    modelName: "gpt-4.1",
    provider: "openai",
    supportsTemperature: true,
    description:
      "Balanced OpenAI production model for long documents and reliable classification.",
    pricing: { inputPerMTok: 2, outputPerMTok: 8 },
  },
  "gpt-4o": {
    label: "GPT-4o",
    modelName: "gpt-4o",
    provider: "openai",
    supportsTemperature: true,
    description: "Legacy OpenAI multimodal model for general tasks.",
    pricing: { inputPerMTok: 2.5, outputPerMTok: 10 },
  },
  "o3-mini": {
    label: "o3-mini",
    modelName: "o3-mini",
    provider: "openai",
    supportsTemperature: false,
    description: "Lightweight OpenAI reasoning model for structured analysis.",
    pricing: { inputPerMTok: 1.1, outputPerMTok: 4.4 },
  },
  "gpt-4.1-mini": {
    label: "GPT-4.1 Mini",
    modelName: "gpt-4.1-mini",
    provider: "openai",
    supportsTemperature: true,
    description:
      "Cost-efficient OpenAI model for high-volume pipeline tasks in listeners.",
    pricing: { inputPerMTok: 0.4, outputPerMTok: 1.6 },
  },
  "claude-sonnet-4-6": {
    label: "Claude Sonnet 4.6",
    modelName: "claude-sonnet-4-6",
    provider: "anthropic",
    supportsTemperature: true,
    description: "Anthropic balanced model for everyday term evaluation.",
    pricing: { inputPerMTok: 3, outputPerMTok: 15 },
  },
  "claude-opus-4-6": {
    label: "Claude Opus 4.6",
    modelName: "claude-opus-4-6",
    provider: "anthropic",
    supportsTemperature: true,
    description: "Anthropic flagship for the most complex classification.",
    pricing: { inputPerMTok: 5, outputPerMTok: 25 },
  },
  "gemini-3.5-flash-lite": {
    label: "Gemini 3.5 Flash-Lite",
    modelName: "gemini-3.5-flash-lite",
    provider: "google",
    supportsTemperature: true,
    description:
      "Low-latency, cost-efficient Google multimodal model with native image, audio, and video understanding.",
    pricing: { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  },
  "gemini-3.6-flash": {
    label: "Gemini 3.6 Flash",
    modelName: "gemini-3.6-flash",
    provider: "google",
    supportsTemperature: true,
    description:
      "Google multimodal model with native image, audio, and video understanding.",
    pricing: { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  },
  "gemini-3.6-pro": {
    label: "Gemini 3.6 Pro",
    modelName: "gemini-3.6-pro",
    provider: "google",
    supportsTemperature: true,
    description:
      "Google flagship multimodal model for the most demanding video and document analysis.",
    pricing: { inputPerMTok: 1.25, outputPerMTok: 10 },
  },
  "deepseek-v4-flash": {
    label: "DeepSeek V4 Flash",
    modelName: "deepseek-v4-flash",
    provider: "deepseek",
    supportsTemperature: true,
    description:
      "DeepSeek cost-efficient V4 model for high-volume term backfill.",
    pricing: { inputPerMTok: 0.14, outputPerMTok: 0.28 },
  },
  "deepseek-v4-pro": {
    label: "DeepSeek V4 Pro",
    modelName: "deepseek-v4-pro",
    provider: "deepseek",
    supportsTemperature: true,
    description: "DeepSeek higher-capability V4 model for harder matches.",
    pricing: { inputPerMTok: 0.435, outputPerMTok: 0.87 },
  },
  "qwen-turbo": {
    label: "Qwen Turbo",
    modelName: "qwen-turbo",
    provider: "alibaba",
    supportsTemperature: true,
    description: "Fast Qwen model via DashScope. Requires ALIBABA_API_KEY.",
    pricing: { inputPerMTok: 0.05, outputPerMTok: 0.2 },
  },
  "qwen-plus": {
    label: "Qwen Plus",
    modelName: "qwen-plus",
    provider: "alibaba",
    supportsTemperature: true,
    description: "Balanced Qwen model for term evaluation.",
    pricing: { inputPerMTok: 0.4, outputPerMTok: 1.2 },
  },
  "qwen-max": {
    label: "Qwen Max",
    modelName: "qwen-max",
    provider: "alibaba",
    supportsTemperature: true,
    description: "Highest-quality Qwen model for difficult matches.",
    pricing: { inputPerMTok: 1.6, outputPerMTok: 6.4 },
  },
  "qwen-flash": {
    label: "Qwen Flash",
    modelName: "qwen-flash",
    provider: "alibaba",
    supportsTemperature: true,
    description: "Low-latency Qwen model for large backfill runs.",
    pricing: { inputPerMTok: 0.05, outputPerMTok: 0.4 },
  },
  "qwen-long": {
    label: "Qwen Long",
    modelName: "qwen-long",
    provider: "alibaba",
    supportsTemperature: true,
    description: "Extended-context Qwen model for long documents.",
    pricing: { inputPerMTok: 0.06, outputPerMTok: 0.24 },
  },
  "qwen3-max": {
    label: "Qwen3 Max",
    modelName: "qwen3-max",
    provider: "alibaba",
    supportsTemperature: true,
    description: "Latest-generation Qwen flagship model.",
    pricing: { inputPerMTok: 1.2, outputPerMTok: 6 },
  },
};

export const chatModelGroups: Array<{
  label: string;
  provider: ChatModelProvider;
  modelIds: ChatModelId[];
}> = chatModelProviders.map((provider) => ({
  provider,
  label: providerLabels[provider],
  modelIds: chatModelIds.filter(
    (modelId) => chatModelRegistry[modelId].provider === provider,
  ),
}));

export function getChatModelDefinition(
  model: ChatModelId,
): ChatModelDefinition {
  return chatModelRegistry[model];
}

export function getChatModelPricing(model: ChatModelId): ChatModelPricing {
  return chatModelRegistry[model].pricing;
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
