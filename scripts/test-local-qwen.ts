// Send a vision chat request to the local OpenAI-compatible Qwen endpoint.
//
// Example:
//   npx tsx scripts/test-local-qwen.ts --image ./photo.jpg
//   npx tsx scripts/test-local-qwen.ts --image https://example.com/photo.jpg --prompt "What is in this image?"
//   npm run test:local-qwen -- --image ./photo.jpg
//   npm run test:local-qwen -- --image "https://bnb-listeners-media.boxx.vn/documents/457622e0-6416-4ece-abd8-45150b7f5391/322074fc-7930-4f3b-9a75-8cd9187270be/1.jpg" --prompt "Tóm tắt ảnh này."

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { Command } from "commander";
import { z } from "zod";

import { getChatModelDefinition } from "@/lib/langchain";
import { buildImageDataUrl } from "@/lib/scoring/utils/build-image-data-url";

const SCRIPT = "test-local-qwen";
const MODEL_ID = "local-qwen3-vl" as const;
const DEFAULT_PROMPT = "Trong ảnh có gì?";

const optionsSchema = z.object({
  image: z.string().min(1, { error: "Provide --image with a local path or URL." }),
  prompt: z.string().min(1, { error: "Prompt cannot be empty." }),
});

type Options = z.infer<typeof optionsSchema>;

type ImagePayload = {
  dataUrl: string;
  bytes: number;
  mimeType: string;
};

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description(
      "Call the local Qwen3-VL OpenAI-compatible chat completions API with a text + image message.",
    )
    .requiredOption(
      "--image <path-or-url>",
      "Local image path, http(s) URL, or data URL",
    )
    .option("--prompt <text>", "User text prompt", DEFAULT_PROMPT);

  program.parse();
  return optionsSchema.parse(program.opts());
}

function mimeFromPath(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}

function bytesFromDataUrl(dataUrl: string): { bytes: number; mimeType: string } {
  const headerEnd = dataUrl.indexOf(",");
  const header = headerEnd >= 0 ? dataUrl.slice(5, headerEnd) : "";
  const mimeType = header.split(";")[0] || "image/jpeg";
  const base64 = headerEnd >= 0 ? dataUrl.slice(headerEnd + 1) : "";
  return { bytes: Buffer.from(base64, "base64").length, mimeType };
}

async function loadImage(image: string): Promise<ImagePayload> {
  if (image.startsWith("data:")) {
    return { dataUrl: image, ...bytesFromDataUrl(image) };
  }

  if (/^https?:\/\//i.test(image)) {
    const dataUrl = await buildImageDataUrl(image);
    return { dataUrl, ...bytesFromDataUrl(dataUrl) };
  }

  const absolute = resolve(image);
  const buffer = await readFile(absolute);
  const mimeType = mimeFromPath(absolute);
  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    bytes: buffer.length,
    mimeType,
  };
}

function extractAssistantText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return undefined;
  }

  const content = (choices[0] as { message?: { content?: unknown } }).message
    ?.content;
  return typeof content === "string" ? content : undefined;
}

async function main() {
  const options = parseArgs();
  const apiKey = process.env.LOCAL_QWEN_API_KEY?.trim();
  const definition = getChatModelDefinition(MODEL_ID);

  if (!apiKey) {
    throw new Error("LOCAL_QWEN_API_KEY is not set.");
  }

  if (!definition.baseURL) {
    throw new Error(
      `Chat model "${MODEL_ID}" is missing a baseURL in the registry.`,
    );
  }

  const image = await loadImage(options.image);
  const endpoint = `${definition.baseURL.replace(/\/$/, "")}/chat/completions`;

  console.log(`[${SCRIPT}] Sending request`, {
    endpoint,
    model: definition.modelName,
    prompt: options.prompt,
    image: options.image,
    mimeType: image.mimeType,
    bytes: image.bytes,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: definition.modelName,
      think: false,
      enable_thinking: false,
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            { type: "image_url", image_url: { url: image.dataUrl } },
          ],
        },
      ],
    }),
  });

  const raw = await response.text();
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    parsed = raw;
  }

  if (!response.ok) {
    throw new Error(
      `API returned ${response.status} ${response.statusText}: ${
        typeof parsed === "string" ? parsed : JSON.stringify(parsed)
      }`,
    );
  }

  const assistantText = extractAssistantText(parsed);

  console.log(`[${SCRIPT}] Response`, {
    status: response.status,
    usage:
      parsed && typeof parsed === "object"
        ? (parsed as { usage?: unknown }).usage
        : undefined,
  });

  if (assistantText) {
    console.log(`[${SCRIPT}] Assistant\n${assistantText}`);
    return;
  }

  console.log(`[${SCRIPT}] Body`, parsed);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
