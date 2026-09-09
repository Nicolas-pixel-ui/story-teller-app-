export type StyleGuideStatus = "draft" | "active" | "archived";

export type ValueProposition = {
  pillar: string;
  description: string;
};

export type TargetAudience = {
  persona: string;
  pain_points: string[];
};

export type WritingRule = {
  do: string;
  dont: string;
};

export type ColorSwatch = {
  name: string;
  hex: string;
  role: string;
};

export type TypographySpec = {
  primary_font?: string;
  heading_font?: string;
  weights?: number[];
};

export type LogoAsset = {
  label: string;
  url: string;
  min_clearance_px?: number;
};

export type SocialChannels = Record<string, Record<string, unknown>>;

export const STYLE_GUIDE_STATUSES: StyleGuideStatus[] = ["draft", "active", "archived"];

export function isStyleGuideStatus(value: unknown): value is StyleGuideStatus {
  return value === "draft" || value === "active" || value === "archived";
}

export function styleGuideDisplayName(guide: { title?: string | null; name?: string | null }) {
  return guide.title?.trim() || guide.name?.trim() || "Untitled Style Guide";
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asValuePropositions(value: unknown): ValueProposition[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const pillar = typeof row.pillar === "string" ? row.pillar.trim() : "";
      const description = typeof row.description === "string" ? row.description.trim() : "";
      if (!pillar && !description) return null;
      return { pillar, description };
    })
    .filter((item): item is ValueProposition => Boolean(item));
}

export function asTargetAudiences(value: unknown): TargetAudience[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const persona = typeof row.persona === "string" ? row.persona.trim() : "";
      const pain_points = asStringArray(row.pain_points);
      if (!persona && pain_points.length === 0) return null;
      return { persona, pain_points };
    })
    .filter((item): item is TargetAudience => Boolean(item));
}

export function asWritingRules(value: unknown): WritingRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const doText = typeof row.do === "string" ? row.do.trim() : "";
      const dont = typeof row.dont === "string" ? row.dont.trim() : "";
      if (!doText && !dont) return null;
      return { do: doText, dont };
    })
    .filter((item): item is WritingRule => Boolean(item));
}

export function asColorPalette(value: unknown): ColorSwatch[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const hex = typeof row.hex === "string" ? row.hex.trim() : "";
      const role = typeof row.role === "string" ? row.role.trim() : "";
      if (!name && !hex) return null;
      return { name, hex, role };
    })
    .filter((item): item is ColorSwatch => Boolean(item));
}

export function asTypography(value: unknown): TypographySpec {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  const weights = Array.isArray(row.weights)
    ? row.weights.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : undefined;
  return {
    primary_font: typeof row.primary_font === "string" ? row.primary_font : undefined,
    heading_font: typeof row.heading_font === "string" ? row.heading_font : undefined,
    weights,
  };
}

export function asLogoAssets(value: unknown): LogoAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    const min_clearance_px =
      typeof row.min_clearance_px === "number" && Number.isFinite(row.min_clearance_px)
        ? row.min_clearance_px
        : undefined;
    if (!label && !url) return [];
    const asset: LogoAsset = { label, url };
    if (min_clearance_px !== undefined) asset.min_clearance_px = min_clearance_px;
    return [asset];
  });
}

export function asSocialChannels(value: unknown): SocialChannels {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: SocialChannels = {};
  for (const [channel, spec] of Object.entries(value as Record<string, unknown>)) {
    const key = channel.trim();
    if (!key || !spec || typeof spec !== "object" || Array.isArray(spec)) continue;
    result[key] = spec as Record<string, unknown>;
  }
  return result;
}
