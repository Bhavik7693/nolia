import { z } from "zod";

export const askRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  model: z.string().trim().min(1).max(200).optional(),
  mode: z.enum(["fast", "verified"]).optional(),
  language: z.enum(["auto", "en", "hi"]).optional(),
  style: z.enum(["Concise", "Balanced", "Detailed", "Creative"]).optional(),
  useWeb: z.boolean().optional(),
  webTopic: z.enum(["general", "news", "finance"]).optional(),
  webTimeRange: z.enum(["day", "week", "month", "year", "d", "w", "m", "y"]).optional(),
});

export type AskRequest = z.infer<typeof askRequestSchema>;

export type Citation = {
  url: string;
  title?: string;
};

export type AskResponse = {
  provider: "openrouter";
  model: string;
  answer: string;
  citations: Citation[];
  followUps?: string[];
  latencyMs: number;
};
