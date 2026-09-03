"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ClientErrorBoundary } from "./client-error-boundary";

const ParticleBackground = dynamic(() => import("./particle-background"), {
  ssr: false,
});

function canCreateWebGLContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export default function ClientParticleBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (window.location.pathname.startsWith("/auth")) {
      return;
    }
    if (!canCreateWebGLContext()) {
      return;
    }
    setEnabled(true);
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <ClientErrorBoundary>
      <ParticleBackground />
    </ClientErrorBoundary>
  );
}
