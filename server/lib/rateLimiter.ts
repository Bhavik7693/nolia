import type { NextFunction, Request, Response } from "express";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type HitCounter = {
  count: number;
  resetAtMs: number;
};

export function createMemoryRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, HitCounter>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip}`;

    const existing = hits.get(key);
    if (!existing || existing.resetAtMs <= now) {
      const resetAtMs = now + options.windowMs;
      hits.set(key, { count: 1, resetAtMs });
      res.setHeader("X-RateLimit-Limit", options.max.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - 1).toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(resetAtMs / 1000).toString());
      return next();
    }

    existing.count += 1;

    res.setHeader("X-RateLimit-Limit", options.max.toString());
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, options.max - existing.count).toString(),
    );
    res.setHeader("X-RateLimit-Reset", Math.ceil(existing.resetAtMs / 1000).toString());

    if (existing.count > options.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAtMs - now) / 1000),
      );
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      const requestId = typeof (req as any).requestId === "string" ? (req as any).requestId : undefined;
      return res
        .status(429)
        .json({ message: "Too Many Requests, please try again later", requestId });
    }

    return next();
  };
}
