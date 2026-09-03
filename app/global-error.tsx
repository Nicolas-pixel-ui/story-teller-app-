"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7ef",
          color: "#1d2e3f",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            padding: "2rem",
            textAlign: "center",
            border: "1px solid rgb(29 46 63 / 0.15)",
            borderRadius: "0.75rem",
            background: "#ffffff",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
            The page failed to load. Retry, or go back to the home page.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.625rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid #1d2e3f",
                background: "#faf7ef",
                color: "#1d2e3f",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "0.625rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid rgb(29 46 63 / 0.2)",
                color: "#1d2e3f",
                textDecoration: "none",
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
