// Best-effort in-memory limiter. On serverless each instance keeps its own counters, so this only slows
// down casual guessing; the rebuild replaces it with a database-backed limit.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || entry.resetAt < now) {
        attempts.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }
    entry.count += 1;
    return entry.count > max;
}

export function clearRateLimit(key: string) {
    attempts.delete(key);
}
