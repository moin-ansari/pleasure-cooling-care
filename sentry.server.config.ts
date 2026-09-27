// Runs on the server (API routes, server components). Off until SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
    dsn,
    enabled: !!dsn,
    tracesSampleRate: 0.1,
});
