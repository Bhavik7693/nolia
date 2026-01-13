import { z } from "zod";
import { OPENROUTER_BASE_URL, env } from "../../config";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";
import { HttpError } from "../../lib/httpError";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionParams = {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs: number;
  temperature?: number;
  maxTokens?: number;
};

const chatCompletionResponseSchema = z
  .object({
    choices: z
      .array(
        z.object({
          message: z.object({
            content: z.string(),
          }),
        }),
      )
      .min(1),
  })
  .passthrough();

export async function openRouterChatCompletion(
  params: ChatCompletionParams,
): Promise<string> {
  const res = await fetchWithTimeout(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "NOLIA",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
      }),
    },
    params.timeoutMs,
  );

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(401, "LLM provider authentication failed");
    }

    throw new HttpError(
      502,
      `LLM provider error (${res.status})`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, "Invalid JSON from LLM provider");
  }

  const parsed = chatCompletionResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(502, "Unexpected response from LLM provider");
  }

  return parsed.data.choices[0].message.content;
}

const modelsResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string(),
            pricing: z
              .object({
                prompt: z.string().optional(),
                completion: z.string().optional(),
                request: z.string().optional(),
              })
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

let cachedFreeModels:
  | { models: string[]; expiresAtMs: number }
  | undefined;

export async function listFreeOpenRouterModels(options?: {
  timeoutMs?: number;
}): Promise<string[]> {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const now = Date.now();

  if (cachedFreeModels && cachedFreeModels.expiresAtMs > now) {
    return cachedFreeModels.models;
  }

  if (!env.OPENROUTER_API_KEY) {
    return [];
  }

  const res = await fetchWithTimeout(
    `${OPENROUTER_BASE_URL}/models`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
    },
    timeoutMs,
  );

  const text = await res.text();
  if (!res.ok) {
    throw new HttpError(502, `Failed to list models (${res.status})`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, "Invalid JSON from model list");
  }

  const parsed = modelsResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(502, "Unexpected model list response");
  }

  const all = parsed.data.data ?? [];
  const free = all
    .filter((m) => {
      const prompt = m.pricing?.prompt;
      const completion = m.pricing?.completion;
      const request = m.pricing?.request;

      const promptCost = prompt === undefined ? 0 : Number.parseFloat(prompt);
      const completionCost =
        completion === undefined ? 0 : Number.parseFloat(completion);
      const requestCost =
        request === undefined ? 0 : Number.parseFloat(request);

      return (
        Number.isFinite(promptCost) &&
        Number.isFinite(completionCost) &&
        Number.isFinite(requestCost) &&
        promptCost <= 0 &&
        completionCost <= 0 &&
        requestCost <= 0
      );
    })
    .map((m) => m.id)
    .slice(0, 100);

  cachedFreeModels = { models: free, expiresAtMs: now + 10 * 60 * 1000 };
  return free;
}
