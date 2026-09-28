"use client";
import { useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void }) => string;
      remove: (id: string) => void;
    };
  }
}

// Cloudflare's bot check, shown right before the customer confirms. Renders nothing when the site is not
// configured with a Turnstile key, so the form works the same as before until the owner sets one up.
// Shared by every form that submits a booking (single or a cart checkout) — load its script once with
// <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" ... /> alongside it.
export default function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const render = () => {
      if (cancelled || !hostRef.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(hostRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
      });
    };

    if (window.turnstile) render();
    else poll = setInterval(() => window.turnstile && (clearInterval(poll), render()), 200);

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      onToken(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={hostRef} className="flex justify-center" />;
}
