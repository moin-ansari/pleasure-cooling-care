// Runs in the browser. Left off entirely (no events sent) until NEXT_PUBLIC_SENTRY_DSN is set on the server,
// so the site works exactly the same in development and for anyone who has not set up a Sentry project.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn,
    enabled: !!dsn,
    tracesSampleRate: 0.1,
    // Session replay is off: it can capture customer names, addresses and phone numbers typed into the booking form.
});
