import type { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";
import {
  asColorPalette,
  asStringArray,
  asTargetAudiences,
  asValuePropositions,
  asWritingRules,
  styleGuideDisplayName,
} from "@/lib/style-guide/types";

type StyleGuide = InferSelectModel<typeof styleGuides>;

export function snapshotStyleGuidePreferences(guide: StyleGuide) {
  return {
    tone: guide.toneId,
    style: guide.writingStyleId,
    perspective: guide.perspectiveId,
    complexityLevel: guide.complexityLevel,
    primaryColor: guide.primaryColor,
    secondaryColor: guide.secondaryColor,
    fontHeading: guide.fontHeading,
    fontBody: guide.fontBody,
    toneDescription: guide.toneDescription,
    title: styleGuideDisplayName(guide),
    clientOrBrandName: guide.clientOrBrandName,
    tagline: guide.tagline,
    missionStatement: guide.missionStatement,
    valuePropositions: asValuePropositions(guide.valuePropositions),
    targetAudiences: asTargetAudiences(guide.targetAudiences),
    toneAttributes: asStringArray(guide.toneAttributes),
    writingRules: asWritingRules(guide.writingRules),
    preferredVocabulary: asStringArray(guide.preferredVocabulary),
    bannedWords: asStringArray(guide.bannedWords),
    colorPalette: asColorPalette(guide.colorPalette),
    imageryGuidelines: guide.imageryGuidelines,
    socialChannels: guide.socialChannels ?? {},
    legalDisclaimers: guide.legalDisclaimers,
  };
}

export function formatStyleGuidePromptBlock(guide: StyleGuide): string {
  const lines: string[] = [`\n\nBrand style guide: ${styleGuideDisplayName(guide)}`];
  if (guide.clientOrBrandName) lines.push(`Client / brand: ${guide.clientOrBrandName}`);
  if (guide.tagline) lines.push(`Tagline: ${guide.tagline}`);
  if (guide.missionStatement) lines.push(`Mission: ${guide.missionStatement}`);

  const values = asValuePropositions(guide.valuePropositions);
  if (values.length > 0) {
    lines.push(
      "Value propositions:",
      ...values.map((item) => `- ${item.pillar}: ${item.description}`.replace(/: $/, ""))
    );
  }

  const audiences = asTargetAudiences(guide.targetAudiences);
  if (audiences.length > 0) {
    lines.push(
      "Target audiences:",
      ...audiences.map((item) => {
        const pains = item.pain_points.length > 0 ? ` (pain points: ${item.pain_points.join(", ")})` : "";
        return `- ${item.persona}${pains}`;
      })
    );
  }

  const attributes = asStringArray(guide.toneAttributes);
  if (attributes.length > 0) lines.push(`Tone attributes: ${attributes.join(", ")}`);

  const rules = asWritingRules(guide.writingRules);
  if (rules.length > 0) {
    lines.push(
      "Writing rules:",
      ...rules.map((rule) => `- Do: ${rule.do || "—"}. Don't: ${rule.dont || "—"}`)
    );
  }

  const preferred = asStringArray(guide.preferredVocabulary);
  if (preferred.length > 0) lines.push(`Preferred vocabulary: ${preferred.join(", ")}`);
  const banned = asStringArray(guide.bannedWords);
  if (banned.length > 0) lines.push(`Banned words: ${banned.join(", ")}`);
  if (guide.imageryGuidelines) lines.push(`Imagery guidelines: ${guide.imageryGuidelines}`);
  if (guide.legalDisclaimers) lines.push(`Legal disclaimers (must include when relevant): ${guide.legalDisclaimers}`);

  return lines.join("\n");
}
