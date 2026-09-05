"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, so it must
 * render its own <html> and cannot rely on any app styling or fonts.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#080605",
          color: "#f2eada",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              letterSpacing: "0.34em",
              fontSize: "0.875rem",
              textTransform: "uppercase",
              color: "#b9ab97",
            }}
          >
            Tavolo
          </p>
          <h1 style={{ fontSize: "2rem", fontWeight: 300, marginTop: "2rem" }}>
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "1rem",
              lineHeight: 1.7,
              color: "#b9ab97",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.9375rem",
            }}
          >
            We hit an unexpected problem. Please try again — and if it persists, call the
            restaurant and we will take your booking over the phone.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#8d8275" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              minHeight: "3rem",
              padding: "0 1.75rem",
              border: "none",
              background: "#f2eada",
              color: "#080605",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: "0.6875rem",
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
