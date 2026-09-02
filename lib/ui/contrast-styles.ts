import type { CSSProperties } from "react";

const INK = "#1d2e3f";
const CREAM = "#faf7ef";

/** Text-shadow trick survives Brave forced-dark inversion better than color alone. */
const creamLabelText: CSSProperties = {
  color: "transparent",
  WebkitTextFillColor: "transparent",
  textShadow: `0 0 0 ${CREAM}`,
};

const inkLabelText: CSSProperties = {
  color: "transparent",
  WebkitTextFillColor: "transparent",
  textShadow: `0 0 0 ${INK}`,
};

/** Inline styles Brave cannot invert away from navy/cream contrast. */
export const brandPrimaryButtonStyle: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `linear-gradient(${INK}, ${INK})`,
  borderColor: INK,
  ...creamLabelText,
};

export const brandSecondaryButtonStyle: CSSProperties = {
  ...brandPrimaryButtonStyle,
  borderColor: "rgba(155, 125, 46, 0.4)",
};

export const brandSurfaceButtonStyle: CSSProperties = {
  backgroundColor: CREAM,
  backgroundImage: `linear-gradient(${CREAM}, ${CREAM})`,
  ...inkLabelText,
};

export const brandSurfaceButtonDarkStyle: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `linear-gradient(${INK}, ${INK})`,
  borderColor: "rgba(250, 247, 239, 0.4)",
  ...creamLabelText,
};

export const brandStatCardStyle: CSSProperties = {
  backgroundColor: CREAM,
  backgroundImage: `linear-gradient(${CREAM}, ${CREAM})`,
  color: INK,
  WebkitTextFillColor: INK,
};

export const brandStatLabelStyle: CSSProperties = {
  color: "rgba(29, 46, 63, 0.8)",
  WebkitTextFillColor: "rgba(29, 46, 63, 0.8)",
};

export const brandStatValueStyle: CSSProperties = {
  color: INK,
  WebkitTextFillColor: INK,
};

export const brandStatCardDarkStyle: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `linear-gradient(${INK}, ${INK})`,
  color: CREAM,
  WebkitTextFillColor: CREAM,
};

export const brandStatLabelDarkStyle: CSSProperties = {
  color: "rgba(250, 247, 239, 0.85)",
  WebkitTextFillColor: "rgba(250, 247, 239, 0.85)",
};

export const brandStatValueDarkStyle: CSSProperties = {
  color: CREAM,
  WebkitTextFillColor: CREAM,
};
