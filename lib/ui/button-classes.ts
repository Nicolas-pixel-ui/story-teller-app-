/**
 * Semantic UI classes backed by literal hex in globals.css.
 * Pair with contrast-styles for inline Brave-safe colors.
 */
export {
  brandPrimaryButtonStyle,
  brandSecondaryButtonStyle,
  brandStatCardStyle as brandSurfaceCardStyle,
  brandStatLabelStyle as brandSurfaceLabelStyle,
  brandStatValueStyle as brandSurfaceValueStyle,
  brandSurfaceButtonStyle,
} from "./contrast-styles";

export const brandPrimaryButtonClassName = "ui-btn-primary";

export const brandSecondaryButtonClassName = "ui-btn-secondary";

export const brandSurfaceCardClassName = "ui-stat-card";

export const brandSurfaceLabelClassName = "ui-stat-label";

export const brandSurfaceValueClassName = "ui-stat-value";

/** Bordered button on cards (e.g. Google sign-in). */
export const brandSurfaceButtonClassName = "ui-surface-btn";
