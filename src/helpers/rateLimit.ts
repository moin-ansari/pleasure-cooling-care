import { db } from "@/lib/db";

// Backed by the rate_limit_buckets table, so every serverless instance on Vercel shares the same counters
// instead of each one counting on its own. One round trip, safe under concurrent requests: the insert and
// the "is the window still open" check happen in a single statement, so two requests racing to create the
// same key cannot both start a fresh window.
export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
    const resetAt = new Date(Date.now() + windowMs);
    const rows = await db.$queryRaw<{ count: number }[]>`
        INSERT INTO rate_limit_buckets (key, count, "resetAt")
        VALUES (${key}, 1, ${resetAt})
        ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN rate_limit_buckets."resetAt" < now() THEN 1 ELSE rate_limit_buckets.count + 1 END,
            "resetAt" = CASE WHEN rate_limit_buckets."resetAt" < now() THEN ${resetAt} ELSE rate_limit_buckets."resetAt" END
        RETURNING count
    `;
    // On a cold key with no race this never runs the cleanup query, so most requests pay nothing extra.
    if (Math.random() < 0.01) {
        db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400000) } } }).catch(() => undefined);
    }
    return (rows[0]?.count ?? 0) > max;
}

export async function clearRateLimit(key: string): Promise<void> {
    await db.rateLimitBucket.deleteMany({ where: { key } });
}
