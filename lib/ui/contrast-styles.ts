import type { CSSProperties } from "react";

const CREAM = "#faf7ef";

/** Cream fill only. Label color is painted from a raster image in CSS so Brave cannot invert it. */
export const brandPrimaryButtonStyle: CSSProperties = {
  forcedColorAdjust: "none",
};

export const brandSecondaryButtonStyle: CSSProperties = {
  forcedColorAdjust: "none",
};

export const brandSurfaceButtonStyle: CSSProperties = {
  backgroundColor: CREAM,
  forcedColorAdjust: "none",
};

export const brandStatCardStyle: CSSProperties = {
  backgroundColor: CREAM,
  forcedColorAdjust: "none",
};

export const brandStatLabelStyle: CSSProperties = {
  forcedColorAdjust: "none",
};

export const brandStatValueStyle: CSSProperties = {
  forcedColorAdjust: "none",
};
