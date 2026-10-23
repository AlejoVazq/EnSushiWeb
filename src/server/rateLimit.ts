/**
 * Fixed-window counter per key, in memory: enough for one server process. Keys look like "codigo:<ip>".
 * Restarting the server resets it, which is fine for slowing down abuse.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

/** True if the action is allowed (and counts it); false once `limit` is reached within `windowMs` */
export const allow = (key: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
};

/** The visitor's IP as the reverse proxy (Caddy, nginx) passes it */
export const clientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
