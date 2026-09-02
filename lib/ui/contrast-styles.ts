import type { CSSProperties } from "react";

/** Inline styles Brave cannot invert away from navy/cream contrast. */
export const brandPrimaryButtonStyle: CSSProperties = {
  backgroundColor: "#1d2e3f",
  color: "#faf7ef",
  WebkitTextFillColor: "#faf7ef",
  borderColor: "#1d2e3f",
};

export const brandSecondaryButtonStyle: CSSProperties = {
  ...brandPrimaryButtonStyle,
  borderColor: "rgba(155, 125, 46, 0.4)",
};

export const brandSurfaceButtonStyle: CSSProperties = {
  backgroundColor: "#faf7ef",
  color: "#1d2e3f",
  WebkitTextFillColor: "#1d2e3f",
};

export const brandSurfaceButtonDarkStyle: CSSProperties = {
  backgroundColor: "#1d2e3f",
  color: "#faf7ef",
  WebkitTextFillColor: "#faf7ef",
};

export const brandStatCardStyle: CSSProperties = {
  backgroundColor: "#faf7ef",
  color: "#1d2e3f",
  WebkitTextFillColor: "#1d2e3f",
};

export const brandStatLabelStyle: CSSProperties = {
  color: "rgba(29, 46, 63, 0.8)",
  WebkitTextFillColor: "rgba(29, 46, 63, 0.8)",
};

export const brandStatValueStyle: CSSProperties = {
  color: "#1d2e3f",
  WebkitTextFillColor: "#1d2e3f",
};
