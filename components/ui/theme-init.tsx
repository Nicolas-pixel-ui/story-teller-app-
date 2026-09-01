"use client";

import { useEffect } from "react";

/** Sync `html.dark` + color-scheme for Brave and other browsers that mishandle dark tokens. */
export function ThemeInit() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return null;
}
