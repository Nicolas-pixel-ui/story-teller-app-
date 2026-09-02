"use client";

import { useEffect } from "react";

/** Sync `html.dark` for Tailwind/custom dark rules without enabling Brave forced dark. */
export function ThemeInit() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = "light";
    };

    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return null;
}
