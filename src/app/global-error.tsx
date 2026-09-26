"use client";

// Last resort when even the page frame fails. It has to bring its own html and body.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#64748b", margin: 0 }}>Please try again. If it keeps happening, call us.</p>
          <button onClick={reset} style={{ background: "#1d4ed8", color: "white", border: 0, borderRadius: 8, padding: "10px 20px", fontSize: 16 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
