import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";

import {
  getChatModelDefinition,
  type ChatModelId,
} from "./registry";

export type CreateChatModelOptions = {
  temperature?: number;
};

export function isChatModelConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function createChatModel(
  model: ChatModelId,
  options?: CreateChatModelOptions,
): BaseChatModel {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI is not configured. Please set OPENAI_API_KEY.",
    );
  }

  const definition = getChatModelDefinition(model);
  const temperature = options?.temperature ?? 0.2;
  const modelOptions = definition.supportsTemperature ? { temperature } : {};

  return new ChatOpenAI({
    model: definition.modelName,
    ...modelOptions,
  });
}
