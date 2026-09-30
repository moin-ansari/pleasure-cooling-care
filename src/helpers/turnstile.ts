// Cloudflare Turnstile: a free, invisible-most-of-the-time bot check for the public booking form.
// Left off entirely (every submission passes) until TURNSTILE_SECRET_KEY is set on the server, matching the
// booking form's own widget, which only renders once NEXT_PUBLIC_TURNSTILE_SITE_KEY is set in the browser.
// Together with the honeypot field, this is the "bot check on the booking form" the launch plan calls for.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

export function turnstileIsConfigured(): boolean {
    return !!process.env.TURNSTILE_SECRET_KEY?.trim();
}

// Never throws. Returns true when the token is valid, or when Turnstile is not configured at all.
export async function verifyTurnstile(token: unknown, remoteIp: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) return true;
    if (typeof token !== "string" || !token) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(VERIFY_URL, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
            signal: controller.signal,
        });
        const json: { success?: boolean } = await res.json().catch(() => ({}));
        return json.success === true;
    } catch {
        // Cloudflare being unreachable should not be the reason a genuine customer cannot book.
        return true;
    } finally {
        clearTimeout(timer);
    }
}
