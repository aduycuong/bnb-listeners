import { ChatAnthropic } from "@langchain/anthropic";
import { ChatAlibabaTongyi } from "@langchain/community/chat_models/alibaba_tongyi";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";

import {
  getChatModelDefinition,
  type ChatModelId,
  type ChatModelProvider,
} from "./registry";

export type CreateChatModelOptions = {
  temperature?: number;
};

const providerEnvKeys: Record<ChatModelProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  alibaba: "ALIBABA_API_KEY",
};

const providerConfigErrors: Record<ChatModelProvider, string> = {
  openai: "OpenAI is not configured. Please set OPENAI_API_KEY.",
  anthropic: "Anthropic is not configured. Please set ANTHROPIC_API_KEY.",
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

  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({
        model: definition.modelName,
        apiKey,
        ...modelOptions,
      });

    case "deepseek":
      return new ChatDeepSeek({
        model: definition.modelName,
        apiKey,
        modelKwargs: deepSeekStructuredOutputModelKwargs,
        ...modelOptions,
      });

    case "alibaba": {
      const region =
        process.env.ALIBABA_REGION === "china" ||
        process.env.ALIBABA_REGION === "us" ||
        process.env.ALIBABA_REGION === "singapore"
          ? process.env.ALIBABA_REGION
          : "singapore";

      return new ChatAlibabaTongyi({
        model: definition.modelName,
        alibabaApiKey: apiKey,
        region,
        ...modelOptions,
      });
    }

    default:
      return new ChatOpenAI({
        model: definition.modelName,
        apiKey,
        ...modelOptions,
      });
  }
}
