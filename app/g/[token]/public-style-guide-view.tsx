import type { ReactNode } from "react";
import { InferSelectModel } from "drizzle-orm";
import { dictionaryEntries, styleGuides } from "@/lib/db/schema";
import {
  asColorPalette,
  asLogoAssets,
  asSocialChannels,
  asStringArray,
  asTargetAudiences,
  asValuePropositions,
  asWritingRules,
  styleGuideDisplayName,
} from "@/lib/style-guide/types";

type StyleGuide = InferSelectModel<typeof styleGuides>;
type DictionaryEntry = InferSelectModel<typeof dictionaryEntries>;

export function PublicStyleGuideView({
  guide,
  dictionary,
}: {
  guide: StyleGuide;
  dictionary: DictionaryEntry[];
}) {
  const title = styleGuideDisplayName(guide);
  const values = asValuePropositions(guide.valuePropositions);
  const audiences = asTargetAudiences(guide.targetAudiences);
  const attributes = asStringArray(guide.toneAttributes);
  const rules = asWritingRules(guide.writingRules);
  const preferred = asStringArray(guide.preferredVocabulary);
  const banned = asStringArray(guide.bannedWords);
  const palette = asColorPalette(guide.colorPalette);
  const logos = asLogoAssets(guide.logoAssets);
  const channels = asSocialChannels(guide.socialChannels);

  return (
    <main className="ui-style-shell min-h-screen">
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide opacity-80">{guide.clientOrBrandName}</p>
          <h1 className="text-3xl font-bold" style={{ color: "#faf7ef" }}>
            {title}
          </h1>
          {guide.tagline ? <p className="text-lg opacity-90">{guide.tagline}</p> : null}
        </header>

        {guide.missionStatement ? (
          <Section title="Mission">
            <p className="whitespace-pre-wrap leading-relaxed">{guide.missionStatement}</p>
          </Section>
        ) : null}

        {values.length > 0 ? (
          <Section title="Value propositions">
            <ul className="space-y-2">
              {values.map((item) => (
                <li key={item.pillar}>
                  <strong>{item.pillar}</strong>
                  {item.description ? ` — ${item.description}` : ""}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {audiences.length > 0 ? (
          <Section title="Audiences">
            <ul className="space-y-2">
              {audiences.map((item) => (
                <li key={item.persona}>
                  <strong>{item.persona}</strong>
                  {item.pain_points.length > 0 ? ` — ${item.pain_points.join(", ")}` : ""}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {attributes.length > 0 || rules.length > 0 ? (
          <Section title="Voice">
            {attributes.length > 0 ? <p>Tone: {attributes.join(", ")}</p> : null}
            {rules.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {rules.map((rule, index) => (
                  <li key={index}>
                    Do: {rule.do || "—"} / Don&apos;t: {rule.dont || "—"}
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        ) : null}

        {preferred.length > 0 || banned.length > 0 ? (
          <Section title="Vocabulary">
            {preferred.length > 0 ? <p>Prefer: {preferred.join(", ")}</p> : null}
            {banned.length > 0 ? <p>Avoid: {banned.join(", ")}</p> : null}
          </Section>
        ) : null}

        {palette.length > 0 || guide.primaryColor ? (
          <Section title="Color">
            <div className="flex flex-wrap gap-3">
              {(palette.length > 0
                ? palette
                : [
                    { name: "Primary", hex: guide.primaryColor || "", role: "Primary" },
                    { name: "Secondary", hex: guide.secondaryColor || "", role: "Secondary" },
                  ].filter((item) => item.hex)
              ).map((swatch) => (
                <div key={`${swatch.name}-${swatch.hex}`} className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: swatch.hex }} />
                  <span className="text-sm">
                    {swatch.name} {swatch.hex}
                    {swatch.role ? ` · ${swatch.role}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {guide.fontHeading || guide.fontBody ? (
          <Section title="Typography">
            <p>Heading: {guide.fontHeading || "—"}</p>
            <p>Body: {guide.fontBody || "—"}</p>
          </Section>
        ) : null}

        {logos.length > 0 ? (
          <Section title="Logos">
            <ul className="space-y-2">
              {logos.map((logo) => (
                <li key={`${logo.label}-${logo.url}`}>
                  {logo.url ? (
                    <a href={logo.url} className="underline" target="_blank" rel="noreferrer">
                      {logo.label || logo.url}
                    </a>
                  ) : (
                    logo.label
                  )}
                  {logo.min_clearance_px ? ` · ${logo.min_clearance_px}px clearance` : ""}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {guide.imageryGuidelines ? (
          <Section title="Imagery">
            <p className="whitespace-pre-wrap">{guide.imageryGuidelines}</p>
          </Section>
        ) : null}

        {Object.keys(channels).length > 0 ? (
          <Section title="Channels">
            <ul className="space-y-2">
              {Object.entries(channels).map(([name, spec]) => (
                <li key={name}>
                  <strong className="capitalize">{name}</strong>
                  {spec.hook_style ? ` · ${String(spec.hook_style)}` : ""}
                  {spec.max_headline_len ? ` · max ${String(spec.max_headline_len)} chars` : ""}
                  {spec.notes ? ` — ${String(spec.notes)}` : ""}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {guide.legalDisclaimers ? (
          <Section title="Legal">
            <p className="whitespace-pre-wrap">{guide.legalDisclaimers}</p>
          </Section>
        ) : null}

        {dictionary.length > 0 ? (
          <Section title="Dictionary">
            <ul className="space-y-2">
              {dictionary.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.term}</strong>
                  {entry.definition ? ` — ${entry.definition}` : ""}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ui-style-panel rounded-xl p-6 space-y-3" style={{ backgroundColor: "#1d2e3f", color: "#faf7ef" }}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
