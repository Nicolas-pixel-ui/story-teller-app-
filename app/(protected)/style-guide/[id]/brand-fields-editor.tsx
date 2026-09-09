"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { InferSelectModel } from "drizzle-orm";
import { styleGuides } from "@/lib/db/schema";
import { BraveMenuSelect } from "./style-choice";
import {
  STYLE_GUIDE_STATUSES,
  asColorPalette,
  asLogoAssets,
  asSocialChannels,
  asStringArray,
  asTargetAudiences,
  asValuePropositions,
  asWritingRules,
  type ColorSwatch,
  type LogoAsset,
  type SocialChannels,
  type StyleGuideStatus,
  type TargetAudience,
  type ValueProposition,
  type WritingRule,
} from "@/lib/style-guide/types";

type StyleGuide = InferSelectModel<typeof styleGuides>;

const inputClass =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2";
const smallInputClass =
  "rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm";

const SOCIAL_PRESETS = ["meta", "tiktok", "linkedin", "x", "youtube", "email"];

export function BrandMetadataFields({
  formData,
  onChange,
}: {
  formData: StyleGuide;
  onChange: (field: keyof StyleGuide, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={formData.title || formData.name || ""}
            onChange={(e) => onChange("title", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Client / brand name</label>
          <input
            type="text"
            value={formData.clientOrBrandName || ""}
            onChange={(e) => onChange("clientOrBrandName", e.target.value)}
            className={inputClass}
            placeholder="Acme Co."
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Tagline</label>
        <input
          type="text"
          value={formData.tagline || ""}
          onChange={(e) => onChange("tagline", e.target.value)}
          className={inputClass}
          placeholder="A short positioning line"
        />
      </div>
      <BraveMenuSelect
        label="Status"
        value={formData.status || "draft"}
        placeholder="Select status"
        options={STYLE_GUIDE_STATUSES.map((status) => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        }))}
        onChange={(next) => onChange("status", next as StyleGuideStatus)}
      />
    </div>
  );
}

export function NarrativeFields({
  formData,
  onChange,
}: {
  formData: StyleGuide;
  onChange: (field: keyof StyleGuide, value: unknown) => void;
}) {
  const values = asValuePropositions(formData.valuePropositions);
  const audiences = asTargetAudiences(formData.targetAudiences);

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-medium mb-2">Mission statement</label>
        <textarea
          value={formData.missionStatement || ""}
          onChange={(e) => onChange("missionStatement", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Why this brand exists and what it promises."
        />
      </div>

      <ObjectList
        title="Value propositions"
        addLabel="Add pillar"
        items={values}
        emptyItem={{ pillar: "", description: "" } satisfies ValueProposition}
        onChange={(next) => onChange("valuePropositions", next)}
        renderItem={(item, update) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className={smallInputClass}
              placeholder="Pillar (e.g. Speed)"
              value={item.pillar}
              onChange={(e) => update({ ...item, pillar: e.target.value })}
            />
            <input
              className={smallInputClass}
              placeholder="Description"
              value={item.description}
              onChange={(e) => update({ ...item, description: e.target.value })}
            />
          </div>
        )}
      />

      <ObjectList
        title="Target audiences"
        addLabel="Add persona"
        items={audiences}
        emptyItem={{ persona: "", pain_points: [] } satisfies TargetAudience}
        onChange={(next) => onChange("targetAudiences", next)}
        renderItem={(item, update) => (
          <div className="space-y-3">
            <input
              className={smallInputClass}
              placeholder="Persona (e.g. Agency Director)"
              value={item.persona}
              onChange={(e) => update({ ...item, persona: e.target.value })}
            />
            <StringListEditor
              values={item.pain_points}
              placeholder="Add a pain point"
              onChange={(pain_points) => update({ ...item, pain_points })}
            />
          </div>
        )}
      />
    </div>
  );
}

export function VoiceFields({
  formData,
  onChange,
}: {
  formData: StyleGuide;
  onChange: (field: keyof StyleGuide, value: unknown) => void;
}) {
  const rules = asWritingRules(formData.writingRules);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Tone attributes</h3>
        <StringListEditor
          values={asStringArray(formData.toneAttributes)}
          placeholder="Add an attribute (e.g. Empathetic)"
          onChange={(next) => onChange("toneAttributes", next)}
        />
      </div>

      <ObjectList
        title="Writing rules"
        addLabel="Add rule"
        items={rules}
        emptyItem={{ do: "", dont: "" } satisfies WritingRule}
        onChange={(next) => onChange("writingRules", next)}
        renderItem={(item, update) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className={smallInputClass}
              placeholder="Do: Use active verbs"
              value={item.do}
              onChange={(e) => update({ ...item, do: e.target.value })}
            />
            <input
              className={smallInputClass}
              placeholder="Don't: Avoid jargon"
              value={item.dont}
              onChange={(e) => update({ ...item, dont: e.target.value })}
            />
          </div>
        )}
      />

      <div>
        <h3 className="text-lg font-semibold mb-3">Preferred vocabulary</h3>
        <StringListEditor
          values={asStringArray(formData.preferredVocabulary)}
          placeholder="Add a preferred word or phrase"
          onChange={(next) => onChange("preferredVocabulary", next)}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Banned words</h3>
        <StringListEditor
          values={asStringArray(formData.bannedWords)}
          placeholder="Add a banned word"
          onChange={(next) => onChange("bannedWords", next)}
        />
      </div>
    </div>
  );
}

export function ExtraVisualFields({
  formData,
  onChange,
}: {
  formData: StyleGuide;
  onChange: (field: keyof StyleGuide, value: unknown) => void;
}) {
  const palette = asColorPalette(formData.colorPalette);
  const logos = asLogoAssets(formData.logoAssets);

  return (
    <div className="space-y-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
      <ObjectList
        title="Named color palette"
        addLabel="Add color"
        items={palette}
        emptyItem={{ name: "", hex: "#000000", role: "" } satisfies ColorSwatch}
        onChange={(next) => onChange("colorPalette", next)}
        renderItem={(item, update) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className={smallInputClass}
              placeholder="Name"
              value={item.name}
              onChange={(e) => update({ ...item, name: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                type="color"
                className="w-12 h-10 rounded cursor-pointer"
                value={item.hex || "#000000"}
                onChange={(e) => update({ ...item, hex: e.target.value })}
              />
              <input
                className={`${smallInputClass} flex-1`}
                placeholder="#0055FF"
                value={item.hex}
                onChange={(e) => update({ ...item, hex: e.target.value })}
              />
            </div>
            <input
              className={smallInputClass}
              placeholder="Role (e.g. Primary CTA)"
              value={item.role}
              onChange={(e) => update({ ...item, role: e.target.value })}
            />
          </div>
        )}
      />

      <ObjectList
        title="Logo assets"
        addLabel="Add logo URL"
        items={logos}
        emptyItem={{ label: "", url: "", min_clearance_px: 24 } satisfies LogoAsset}
        onChange={(next) => onChange("logoAssets", next)}
        renderItem={(item, update) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className={smallInputClass}
              placeholder="Label (e.g. Dark SVG)"
              value={item.label}
              onChange={(e) => update({ ...item, label: e.target.value })}
            />
            <input
              className={smallInputClass}
              placeholder="https://..."
              value={item.url}
              onChange={(e) => update({ ...item, url: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className={smallInputClass}
              placeholder="Min clearance (px)"
              value={item.min_clearance_px ?? ""}
              onChange={(e) =>
                update({
                  ...item,
                  min_clearance_px: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        )}
      />

      <div>
        <label className="block text-sm font-medium mb-2">Imagery guidelines</label>
        <textarea
          value={formData.imageryGuidelines || ""}
          onChange={(e) => onChange("imageryGuidelines", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Photography mood, framing, color grading notes."
        />
      </div>
    </div>
  );
}

export function ChannelFields({
  formData,
  onChange,
}: {
  formData: StyleGuide;
  onChange: (field: keyof StyleGuide, value: unknown) => void;
}) {
  const channels = asSocialChannels(formData.socialChannels);
  const entries = Object.entries(channels);

  const upsertChannel = (name: string, spec: Record<string, unknown>) => {
    const next: SocialChannels = { ...channels };
    if (!name.trim()) return;
    next[name.trim()] = spec;
    onChange("socialChannels", next);
  };

  const renameChannel = (from: string, to: string) => {
    const next: SocialChannels = {};
    for (const [key, spec] of entries) {
      next[key === from ? to : key] = spec;
    }
    onChange("socialChannels", next);
  };

  const removeChannel = (name: string) => {
    const next = { ...channels };
    delete next[name];
    onChange("socialChannels", next);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Social channel guardrails</h3>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_PRESETS.filter((preset) => !channels[preset]).map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full border border-zinc-400 px-3 py-1 text-xs capitalize"
              onClick={() => upsertChannel(preset, { notes: "" })}
            >
              Add {preset}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-zinc-400 px-3 py-1 text-xs"
            onClick={() => upsertChannel(`channel-${entries.length + 1}`, { notes: "" })}
          >
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm opacity-80">No channel rules yet. Add Meta, TikTok, or a custom channel.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(([name, spec]) => (
            <div key={name} className="rounded-lg border border-zinc-500/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className={smallInputClass}
                  value={name}
                  onChange={(e) => renameChannel(name, e.target.value)}
                />
                <button type="button" onClick={() => removeChannel(name)} className="p-2" title="Remove channel">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className={smallInputClass}
                  placeholder="Max headline length"
                  value={String(spec.max_headline_len ?? "")}
                  onChange={(e) =>
                    upsertChannel(name, {
                      ...spec,
                      max_headline_len: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <input
                  className={smallInputClass}
                  placeholder="Hook style (e.g. Problem first)"
                  value={String(spec.hook_style ?? "")}
                  onChange={(e) => upsertChannel(name, { ...spec, hook_style: e.target.value })}
                />
              </div>
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Channel notes"
                value={String(spec.notes ?? "")}
                onChange={(e) => upsertChannel(name, { ...spec, notes: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Legal disclaimers</label>
        <textarea
          value={formData.legalDisclaimers || ""}
          onChange={(e) => onChange("legalDisclaimers", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Mandatory compliance text, license credits, disclosures."
        />
      </div>
    </div>
  );
}

export function SharingFields({
  isPublic,
  shareUrl,
  isSaving,
  onToggle,
}: {
  isPublic: boolean;
  shareUrl: string | null;
  isSaving: boolean;
  onToggle: (next: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-500/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">View-only share link</h3>
          <p className="text-sm opacity-80">External visitors can read this brand book, but cannot edit it.</p>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onToggle(!isPublic)}
          className="rounded-full border px-3 py-1 text-sm disabled:opacity-50"
        >
          {isPublic ? "Disable sharing" : "Enable sharing"}
        </button>
      </div>
      {isPublic && shareUrl ? (
        <div className="flex gap-2">
          <input readOnly value={shareUrl} className={inputClass} />
          <button type="button" onClick={copy} className="p-2" title="Copy link">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StringListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    if (values.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full border border-zinc-400 px-3 py-1 text-sm">
            {value}
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={smallInputClass}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
}

function ObjectList<T>({
  title,
  addLabel,
  items,
  emptyItem,
  onChange,
  renderItem,
}: {
  title: string;
  addLabel: string;
  items: T[];
  emptyItem: T;
  onChange: (next: T[]) => void;
  renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => onChange([...items, emptyItem])}
          className="inline-flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm opacity-80">None yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2 rounded-lg border border-zinc-500/40 p-3">
              <div className="flex-1">{renderItem(item, (next) => onChange(items.map((row, i) => (i === index ? next : row))), index)}</div>
              <button type="button" className="p-2" onClick={() => onChange(items.filter((_, i) => i !== index))}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
