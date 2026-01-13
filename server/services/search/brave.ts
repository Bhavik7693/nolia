import { z } from "zod";
import { env } from "../../config";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";
import { HttpError } from "../../lib/httpError";
import type { WebSearchResult } from "./types";

const braveResponseSchema = z
  .object({
    web: z
      .object({
        results: z
          .array(
            z.object({
              title: z.string().default(""),
              url: z.string(),
              description: z.string().default(""),
            }),
          )
          .default([]),
      })
      .optional(),
  })
  .passthrough();

export async function braveWebSearch(params: {
  query: string;
  count: number;
  timeoutMs: number;
}): Promise<WebSearchResult[]> {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return [];
  }

  const url = new URL(env.BRAVE_SEARCH_BASE_URL ?? "https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", params.query);
  url.searchParams.set("count", String(params.count));

  const res = await fetchWithTimeout(
    url.toString(),
    {
      method: "GET",
      headers: {
        "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
        "Accept": "application/json",
      },
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

  const parsed = braveResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(502, "Unexpected search provider response");
  }

  const results = parsed.data.web?.results ?? [];

  return results
    .map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }))
    .filter((r) => !!r.url)
    .slice(0, params.count);
}
