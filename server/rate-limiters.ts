import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

interface UserClaims {
  sub?: string;
}

interface RequestUser {
  claims?: UserClaims;
  id?: string;
}

interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  session: Request["session"] & { userId?: string };
}

function userAwareKey(req: Request): string {
  const r = req as AuthenticatedRequest;
  const userId = r.user?.claims?.sub || r.user?.id || r.session?.userId;
  if (userId) return `user:${userId}`;
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

/**
 * General limiter — applied globally to /api/* before authentication runs.
 * Uses normalized IP (IPv6-safe) as the key since req.user is not populated yet.
 * 300 requests/min per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? "")}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

/**
 * Strict limiter — applied after isAuthenticated middleware on expensive endpoints.
 * Uses authenticated user ID as the key (falls back to normalized IP for edge cases).
 * 60 requests/min per user.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userAwareKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests to this endpoint, please try again later." },
});
