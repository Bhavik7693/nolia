import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { askPipeline } from "./services/ask/askPipeline";
import { env } from "./config";
import { HttpError } from "./lib/httpError";
import { createMemoryRateLimiter } from "./lib/rateLimiter";
import { formatZodError } from "./lib/zodError";
import { askRequestSchema } from "./validators/ask";
import { listFreeOpenRouterModels } from "./services/llm/openrouter";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      requestId: (req as any).requestId,
      uptimeSec: Math.floor(process.uptime()),
      env: process.env.NODE_ENV ?? "development",
    });
  });

  app.get("/api/models", async (_req, res, next) => {
    try {
      const models = await listFreeOpenRouterModels({ timeoutMs: 10_000 });
      res.json({
        provider: "openrouter",
        models,
        requiresApiKey: !env.OPENROUTER_API_KEY,
      });
    } catch (err) {
      next(err);
    }
  });

  const askRateLimit = createMemoryRateLimiter({
    windowMs: 60_000,
    max: 10,
    keyPrefix: "ask",
  });

  app.post("/api/ask", askRateLimit, async (req, res, next) => {
    try {
      const input = askRequestSchema.parse(req.body);
      const result = await askPipeline(input);
      res.json(result);
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new HttpError(400, formatZodError(err)));
      }
      return next(err);
    }
  });

  return httpServer;
}
