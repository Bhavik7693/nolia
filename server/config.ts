import { z } from "zod";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.string().min(1).optional(),
  OPENROUTER_DEFAULT_MODEL: z.string().min(1).optional(),
  BRAVE_SEARCH_API_KEY: z.string().min(1).optional(),
  BRAVE_SEARCH_BASE_URL: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
  TAVILY_BASE_URL: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_DEFAULT_MODEL,
  BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
  BRAVE_SEARCH_BASE_URL: process.env.BRAVE_SEARCH_BASE_URL,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  TAVILY_BASE_URL: process.env.TAVILY_BASE_URL,
});

export const OPENROUTER_BASE_URL =
  env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
