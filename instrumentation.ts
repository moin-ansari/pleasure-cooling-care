// Next.js calls register() once on server start, before any route runs. It loads the matching Sentry config
// for the current runtime. onRequestError reports server-side errors Next.js would otherwise only log.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config");
    }
}

export const onRequestError = async (...args: Parameters<Required<typeof import("@sentry/nextjs")>["captureRequestError"]>) => {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(...args);
};
