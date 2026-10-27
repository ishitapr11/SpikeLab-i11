"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#f3efe4", color: "#191814", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", color: "#66625a", fontSize: 11, fontFamily: "monospace" }}>SpikeLab</p>
          <h1 style={{ fontSize: 40, fontWeight: 400 }}>Something went wrong.</h1>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, width: "fit-content", border: 0, borderRadius: 4, background: "#191814", color: "#f3efe4", padding: "10px 18px", fontFamily: "inherit", fontSize: 15 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
