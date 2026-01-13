import { z } from "zod";
import { env } from "../../config";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";
import { HttpError } from "../../lib/httpError";
import type { WebSearchResult } from "./types";

const tavilyResponseSchema = z
  .object({
    results: z
      .array(
        z
          .object({
            title: z.string().default(""),
            url: z.string(),
            content: z.string().default(""),
            raw_content: z.string().nullable().optional(),
            rawContent: z.string().nullable().optional(),
            published_date: z.string().nullable().optional(),
            publishedDate: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export type TavilySearchOptions = {
  topic?: "general" | "news" | "finance";
  timeRange?: "day" | "week" | "month" | "year" | "d" | "w" | "m" | "y";
  searchDepth?: "basic" | "advanced" | "fast" | "ultra-fast";
  includeRawContent?: false | "text" | "markdown";
};

export async function tavilyWebSearch(params: {
  query: string;
  maxResults: number;
  timeoutMs: number;
  options?: TavilySearchOptions;
}): Promise<{ results: WebSearchResult[]; rawByUrl: Map<string, string> }> {
  if (!env.TAVILY_API_KEY) {
    return { results: [], rawByUrl: new Map() };
  }

  const baseUrl = env.TAVILY_BASE_URL ?? "https://api.tavily.com";
  const url = new URL("/search", baseUrl);

  const body = {
    query: params.query,
    max_results: params.maxResults,
    topic: params.options?.topic ?? "general",
    time_range: params.options?.timeRange,
    search_depth: params.options?.searchDepth ?? "basic",
    include_answer: false,
    include_raw_content: params.options?.includeRawContent ?? false,
  };

  const res = await fetchWithTimeout(
    url.toString(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
    params.timeoutMs,
  );

  const text = await res.text();
  if (!res.ok) {
    throw new HttpError(502, `Search provider error (${res.status})`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, "Invalid JSON from search provider");
  }

  const parsed = tavilyResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(502, "Unexpected search provider response");
  }

  const rawByUrl = new Map<string, string>();

  const results = parsed.data.results
    .map((r) => {
      const raw = r.raw_content ?? r.rawContent ?? null;
      if (raw) rawByUrl.set(r.url, raw);

      const published = r.published_date ?? r.publishedDate ?? null;
      const snippetBase = r.content;
      const snippet = published ? `${snippetBase}\nPublished: ${published}` : snippetBase;

      return {
        title: r.title,
        url: r.url,
        snippet,
      } satisfies WebSearchResult;
    })
    .filter((r) => !!r.url)
    .slice(0, params.maxResults);

  return { results, rawByUrl };
}
