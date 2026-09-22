import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

import {
  getChatModelDefinition,
  type ChatModelId,
  type ChatModelProvider,
} from "./registry";

export type CreateChatModelOptions = {
  temperature?: number;
  /** Upper bound on generated tokens; needed for long outputs like HTML docs. */
  maxTokens?: number;
  /**
   * Reasoning effort for OpenAI reasoning models (gpt-5.x, gpt-6, o-series).
   * Lower effort leaves more of the token budget for the visible output.
   * Ignored by non-reasoning models and other providers.
   */
  reasoningEffort?: "low" | "medium" | "high";
};

const alibabaCompatibleBaseUrls = {
  china: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  singapore: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  us: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
} as const;

const providerEnvKeys: Record<ChatModelProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  alibaba: "ALIBABA_API_KEY",
};

const providerConfigErrors: Record<ChatModelProvider, string> = {
  openai: "OpenAI is not configured. Please set OPENAI_API_KEY.",
  anthropic: "Anthropic is not configured. Please set ANTHROPIC_API_KEY.",
  google: "Google Gemini is not configured. Please set GEMINI_API_KEY.",
  deepseek: "DeepSeek is not configured. Please set DEEPSEEK_API_KEY.",
  alibaba: "Alibaba DashScope is not configured. Please set ALIBABA_API_KEY.",
};

/** DeepSeek V4 defaults to thinking mode, which rejects forced tool_choice. */
const deepSeekStructuredOutputModelKwargs = {
  thinking: { type: "disabled" as const },
};

function getProviderApiKey(provider: ChatModelProvider): string | undefined {
  const envKey = providerEnvKeys[provider];
  return process.env[envKey]?.trim();
}

export function isChatModelConfigured(model?: ChatModelId): boolean {
  if (!model) {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  return Boolean(getProviderApiKey(getChatModelDefinition(model).provider));
}

export function createChatModel(
  model: ChatModelId,
  options?: CreateChatModelOptions,
): BaseChatModel {
  const definition = getChatModelDefinition(model);
  const provider = definition.provider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    throw new Error(providerConfigErrors[provider]);
  }

  const temperature = options?.temperature ?? 0.2;
  const modelOptions = definition.supportsTemperature ? { temperature } : {};
  const maxTokens = options?.maxTokens;
  const maxTokensOption = maxTokens ? { maxTokens } : {};

  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({
        model: definition.modelName,
        apiKey,
        ...modelOptions,
        ...maxTokensOption,
      });

    case "google":
      return new ChatGoogleGenerativeAI({
        model: definition.modelName,
        apiKey,
        ...modelOptions,
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      });

    case "deepseek":
      return new ChatDeepSeek({
        model: definition.modelName,
        apiKey,
        modelKwargs: deepSeekStructuredOutputModelKwargs,
        ...modelOptions,
        ...maxTokensOption,
      });

    case "alibaba": {
      const region =
        process.env.ALIBABA_REGION === "china" ||
        process.env.ALIBABA_REGION === "us" ||
        process.env.ALIBABA_REGION === "singapore"
          ? process.env.ALIBABA_REGION
          : "singapore";

      return new ChatOpenAI({
        model: definition.modelName,
        apiKey,
        configuration: {
          baseURL: alibabaCompatibleBaseUrls[region],
        },
        ...modelOptions,
        ...maxTokensOption,
      });
    }

    default: {
      // Newer OpenAI reasoning models (e.g. gpt-5.x, gpt-6, o-series) reject
      // `max_tokens` and require `max_completion_tokens`. These are exactly the
      // models that do not support `temperature`. Reasoning tokens also count
      // against that budget, so keeping effort low preserves room for output.
      const isReasoningModel = !definition.supportsTemperature;

      // LangChain only auto-routes `max_completion_tokens` for models it
      // recognizes as reasoning (o-series, gpt-5*); newer ones like gpt-6 are
      // not recognized and would wrongly get `max_tokens`. Cover that gap by
      // passing the correct param ourselves via `modelKwargs`.
      const name = definition.modelName;
      const langchainKnowsReasoning =
        /^o\d/.test(name) ||
        (name.startsWith("gpt-5") && !name.startsWith("gpt-5-chat"));

      const extraKwargs: Record<string, unknown> = {};
      const tokenOption: { maxTokens?: number } = {};
      if (maxTokens) {
        if (isReasoningModel && !langchainKnowsReasoning) {
          extraKwargs.max_completion_tokens = maxTokens;
        } else {
          tokenOption.maxTokens = maxTokens;
        }
      }
      if (isReasoningModel && options?.reasoningEffort) {
        extraKwargs.reasoning_effort = options.reasoningEffort;
      }
      const modelKwargsOption =
        Object.keys(extraKwargs).length > 0 ? { modelKwargs: extraKwargs } : {};

      return new ChatOpenAI({
        model: definition.modelName,
        apiKey,
        ...modelOptions,
        ...tokenOption,
        ...modelKwargsOption,
      });
    }
  }
}
