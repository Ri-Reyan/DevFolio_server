import type { Request, Response, NextFunction } from "express";
import sendResponse from "../global/sendResponse.js";
import redis from "../lib/redis.js";

type RateLimiterOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

const getClientKey = (req: Request) =>
  req.ip || req.socket.remoteAddress || "unknown";

const rateLimiter = ({
  windowMs,
  max,
  keyPrefix = "api",
}: RateLimiterOptions) => {
  if (windowMs <= 0 || max <= 0) {
    throw new Error("Rate limiter windowMs and max must be greater than zero");
  }

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate-limit:${keyPrefix}:${getClientKey(req)}`;

    try {
      if (!redis) {
        return next();
      }

      // Single pipeline round-trip
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const [count, rawTtl] = (await pipeline.exec()) as [number, number];

      let ttl = rawTtl;
      if (ttl < 0) {
        await redis.expire(key, windowSeconds);
        ttl = windowSeconds;
      }

      const remaining = Math.max(max - count, 0);

      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader(
        "RateLimit-Reset",
        String(Math.ceil(Date.now() / 1000) + Math.max(ttl, 0)),
      );

      if (count > max) {
        res.setHeader("Retry-After", String(Math.max(ttl, 1)));

        return sendResponse(res, {
          success: false,
          statusCode: 429,
          message: "Too many requests. Please try again later.",
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        });
      }

      return next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      return next();
    }
  };
};

export default rateLimiter;
