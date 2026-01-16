import type { Express } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import { storage } from "./storage";
import { ZodError } from "zod";
import { askPipeline } from "./services/ask/askPipeline";
import { env } from "./config";
import { HttpError } from "./lib/httpError";
import { createMemoryRateLimiter } from "./lib/rateLimiter";
import { formatZodError } from "./lib/zodError";
import { askRequestSchema } from "./validators/ask";
import { listFreeOpenRouterModels } from "./services/llm/openrouter";

type AnonProfile = {
  anonId: string;
  createdAtMs: number;
  lastSeenAtMs: number;
  askCount: number;
  lastLanguage?: string;
  lastStyle?: string;
  topicCounts: Record<string, number>;
};

const anonProfiles = new Map<string, AnonProfile>();

let anonProfileOps = 0;

function maybePruneAnonProfiles(now: number) {
  anonProfileOps += 1;
  if (anonProfileOps % 50 !== 0 && anonProfiles.size < 2000) return;

  const staleMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = now - staleMs;
  anonProfiles.forEach((v, k) => {
    if (v.lastSeenAtMs < cutoff) anonProfiles.delete(k);
  });

  const maxEntries = 5000;
  if (anonProfiles.size <= maxEntries) return;

  anonProfiles.forEach((_v, k) => {
    if (anonProfiles.size <= maxEntries) return;
    anonProfiles.delete(k);
  });
}

function safeAnonId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.length > 200) return undefined;
  if (!/^[A-Za-z0-9._:-]+$/.test(v)) return undefined;
  return v;
}

function inferTopic(question: string): string | undefined {
  const q = question.toLowerCase();
  if (/\b(stock|crypto|bitcoin|finance|loan|interest\s+rate|budget)\b/i.test(q)) return "finance";
  if (/\b(health|symptom|medicine|doctor|treatment|disease)\b/i.test(q)) return "health";
  if (/\b(law|legal|court|contract|ipc|crpc|section\s+\d+)\b/i.test(q)) return "legal";
  if (/\b(code|program|javascript|typescript|python|react|node|api|bug)\b/i.test(q)) return "technology";
  if (/\b(history|ancient|empire|war\b|king|dynasty)\b/i.test(q)) return "history";
  if (/\b(design|ui|ux|logo|brand|typography)\b/i.test(q)) return "design";
  if (/\b(science|physics|chemistry|biology|space|nasa)\b/i.test(q)) return "science";
  if (/\b(business|startup|marketing|sales|strategy)\b/i.test(q)) return "business";
  return undefined;
}

function upsertAnonProfile(params: { anonId: string; question: string; style?: unknown; language?: unknown }) {
  const now = Date.now();
  const existing = anonProfiles.get(params.anonId);
  const profile: AnonProfile = existing ?? {
    anonId: params.anonId,
    createdAtMs: now,
    lastSeenAtMs: now,
    askCount: 0,
    topicCounts: {},
  };

  profile.lastSeenAtMs = now;
  profile.askCount += 1;

  if (typeof params.language === "string") {
    profile.lastLanguage = params.language;
  }
  if (typeof params.style === "string") {
    profile.lastStyle = params.style;
  }

  const topic = inferTopic(params.question);
  if (topic) {
    profile.topicCounts[topic] = (profile.topicCounts[topic] ?? 0) + 1;
  }

  anonProfiles.set(params.anonId, profile);
}

type AskCacheEntry = {
  expiresAtMs: number;
  value: unknown;
};

const askCache = new Map<string, AskCacheEntry>();
const askInFlight = new Map<string, Promise<unknown>>();

let askCacheOps = 0;

function maybePruneAskCache(now: number) {
  askCacheOps += 1;
  if (askCacheOps % 50 !== 0 && askCache.size < 200) return;

  askCache.forEach((v, k) => {
    if (v.expiresAtMs <= now) askCache.delete(k);
  });

  const maxEntries = 500;
  if (askCache.size <= maxEntries) return;

  askCache.forEach((_v, k) => {
    if (askCache.size <= maxEntries) return;
    askCache.delete(k);
  });
}

function stableAskCacheKey(params: {
  ip: string;
  body: unknown;
}): string {
  const raw = JSON.stringify({ ip: params.ip, body: params.body });
  return createHash("sha256").update(raw).digest("hex");
}

function normalizeBaseUrlFromEnv(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    u.hash = "";
    u.search = "";
    const out = u.toString().replace(/\/+$/, "");
    return out;
  } catch {
    return "";
  }
}

function firstForwardedHeaderValue(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

function getOriginFromRequest(req: any): string {
  const fromEnv = normalizeBaseUrlFromEnv(process.env.PUBLIC_BASE_URL);
  if (fromEnv) return fromEnv;

  const forwardedProto = firstForwardedHeaderValue(req?.headers?.["x-forwarded-proto"]);
  const forwardedHost = firstForwardedHeaderValue(req?.headers?.["x-forwarded-host"]);

  const proto =
    forwardedProto && /^(https|http)$/i.test(forwardedProto)
      ? forwardedProto.toLowerCase()
      : typeof req.protocol === "string" && req.protocol
        ? req.protocol
        : "https";

  const host =
    forwardedHost ||
    (typeof req.get === "function" ? (req.get("host") as string | undefined) : undefined);

  if (!host) return "";
  return `${proto}://${host}`;
}

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

  app.get("/robots.txt", (req, res) => {
    const origin = getOriginFromRequest(req);
    res.type("text/plain");
    res.send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        origin ? `Sitemap: ${origin}/sitemap.xml` : "Sitemap: /sitemap.xml",
        "",
      ].join("\n"),
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    const origin = getOriginFromRequest(req);
    const base = origin || "";
    const urls = [
      `${base}/`,
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .filter((u) => u.startsWith("http"))
        .map(
          (loc) =>
            `  <url><loc>${loc}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        )
        .join("\n") +
      `\n</urlset>\n`;

    res.type("application/xml");
    res.send(xml);
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

      const anonId = safeAnonId(req.header("x-nolia-anon-id"));
      if (anonId) {
        upsertAnonProfile({
          anonId,
          question: input.question,
          style: input.style,
          language: input.language,
        });
      }

      const now = Date.now();
      maybePruneAskCache(now);
      maybePruneAnonProfiles(now);

      const ip = typeof req.ip === "string" && req.ip ? req.ip : "unknown";
      const cachePartition = anonId ?? ip;
      const key = stableAskCacheKey({ ip: cachePartition, body: input });
      const cached = askCache.get(key);
      if (cached && cached.expiresAtMs > now) {
        return res.json(cached.value);
      }

      const existingInFlight = askInFlight.get(key);
      if (existingInFlight) {
        const value = await existingInFlight;
        return res.json(value);
      }

      const p = (async () => {
        const result = await askPipeline(input);
        askCache.set(key, { value: result, expiresAtMs: Date.now() + 30_000 });
        return result;
      })();

      askInFlight.set(key, p);
      try {
        const result = await p;
        return res.json(result);
      } finally {
        askInFlight.delete(key);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new HttpError(400, formatZodError(err)));
      }
      return next(err);
    }
  });

  return httpServer;
}
