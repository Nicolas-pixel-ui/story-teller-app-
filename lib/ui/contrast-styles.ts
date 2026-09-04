import type { CSSProperties } from "react";

const INK = "#1d2e3f";
const CREAM = "#faf7ef";

/** Inline fallbacks mirroring the .ui-* rules: cream fill, ink text. */
const inkOnCream: CSSProperties = {
  backgroundColor: CREAM,
  color: INK,
  WebkitTextFillColor: INK,
};

/** White on indigo — high contrast on gold surfaces; distinct from navy textareas. */
const whiteOnIndigo: CSSProperties = {
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

export const brandPrimaryButtonStyle: CSSProperties = inkOnCream;

export const brandSecondaryButtonStyle: CSSProperties = inkOnCream;

export const brandSurfaceButtonStyle: CSSProperties = inkOnCream;

export const brandInkButtonStyle: CSSProperties = whiteOnIndigo;

export const brandStatCardStyle: CSSProperties = inkOnCream;

export const brandStatLabelStyle: CSSProperties = {
  color: "rgba(29, 46, 63, 0.8)",
  WebkitTextFillColor: "rgba(29, 46, 63, 0.8)",
};

export const brandStatValueStyle: CSSProperties = {
  color: INK,
  WebkitTextFillColor: INK,
};
