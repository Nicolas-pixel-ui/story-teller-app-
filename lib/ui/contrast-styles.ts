import type { CSSProperties } from "react";

const INK = "#1d2e3f";
const CREAM = "#faf7ef";
const WHITE = "#ffffff";
const GOLD = "#9b7d2e";

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

/** Inactive style-guide sidebar tab: white on ink, gold border (Brave-safe). */
export const brandStyleTabStyle: CSSProperties = {
  colorScheme: "dark",
  backgroundColor: INK,
  backgroundImage: "none",
  border: `2px solid ${GOLD}`,
  color: WHITE,
  WebkitTextFillColor: WHITE,
};

/** Active style-guide sidebar tab: white on gold. */
export const brandStyleTabActiveStyle: CSSProperties = {
  colorScheme: "dark",
  backgroundColor: GOLD,
  backgroundImage: "none",
  border: `2px solid ${GOLD}`,
  color: WHITE,
  WebkitTextFillColor: WHITE,
};

/** Style-guide editor panel: white copy on ink. */
export const brandStylePanelStyle: CSSProperties = {
  colorScheme: "dark",
  backgroundColor: INK,
  backgroundImage: "none",
  color: WHITE,
  WebkitTextFillColor: WHITE,
};
