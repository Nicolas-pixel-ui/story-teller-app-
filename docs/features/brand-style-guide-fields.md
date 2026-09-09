# Feature Name
Brand Style Guide Fields

## Goal
Turn existing story-focused style guides into full client/brand books: positioning, voice rules, visual specs, channel guardrails, and view-only share links. This gives marketers and storytellers one place to store a brand so generated stories and ads stay on-voice.

## User Story
As a marketer or agency storyteller, I want to capture a client’s narrative, voice, visuals, and channel rules in a style guide, so that every story and shareable brief follows the same brand.

## Functional Requirements
1. Keep the existing `style_guides` table and story-oriented columns (`name`, tone, writing style, colors, fonts, dictionary). Do not drop or rename those columns.
2. Add brand metadata: `title`, `client_or_brand_name` (required), `tagline`, `status` (`draft` | `active` | `archived`), `is_public`, and unique `share_token`.
3. Add narrative fields: `mission_statement`, `value_propositions` (JSONB array of `{pillar, description}`), `target_audiences` (JSONB array of `{persona, pain_points}`).
4. Add voice fields: `tone_attributes` (JSONB string array), `writing_rules` (JSONB `{do, dont}`), `preferred_vocabulary` and `banned_words` (text arrays).
5. Add visual fields: `color_palette` (JSONB `{name, hex, role}`), `typography` (JSONB), `logo_assets` (JSONB `{label, url, min_clearance_px}`), `imagery_guidelines`.
6. Add channel fields: `social_channels` (JSONB map) and `legal_disclaimers`.
7. Existing rows backfill `title` and `client_or_brand_name` from `name` so the new NOT NULL columns succeed.
8. The style guide editor exposes tabs for Overview, Narrative, Voice, Visuals, Channels, Dictionary, and AI Import. Saving persists all new fields.
9. Owners can toggle a view-only public link. Enabling sharing creates a `share_token` if missing. Disabling sharing sets `is_public` false without rotating the token.
10. Unauthenticated visitors can open `/g/{share_token}` when `is_public` is true. Private or unknown tokens return 404.
11. Creating a story with a style guide snapshots the new brand fields into `stories.style_preferences` and injects them into the generation prompt.
12. Duplicate copies brand fields but clears `share_token` and sets `is_public` false.

## Data Requirements
- Alter `public.style_guides` (no new table).
- Keep `dictionary_entries` as-is.
- RLS: owner policies stay; add SELECT for public shared rows (`is_public` and non-null `share_token`) on `style_guides` and related `dictionary_entries`.
- Existing `name` remains the uniqueness key for create/duplicate; `title` stays in sync with `name` on save.

## User Flow
1. User opens Style Guides and creates or edits a guide.
2. User fills brand metadata, mission, audiences, voice rules, palette, logos, channel notes, and legal copy.
3. User saves. Status can move from draft to active (or archived).
4. User optionally enables a public share link and copies `/g/{token}`.
5. An external viewer opens the link and reads a view-only brand book.
6. User selects the guide when creating a story; generation uses the stored brand voice.

## Acceptance Criteria
- Migration adds the new columns with defaults; existing guides remain readable and editable.
- Editor can create, edit, save, and duplicate every new field listed above.
- Public share URL works only when `is_public` is true and the token matches.
- Story creation prompt includes mission, tone attributes, writing rules, vocabulary, banned words, and legal disclaimers when present.
- Production database is migrated so Vercel can read/write the new columns.

## Edge Cases
- Existing guides with only `name`: title and client/brand default to that name.
- Empty JSON/array fields render as empty editors, not errors.
- Invalid status values are rejected; default is `draft`.
- Share token collisions retry generation.
- Duplicate must not reuse a live share token.
- Public page does not expose owner `user_id` or edit actions.

## Non-Functional Requirements
- Match existing style-guide UI (dark indigo/cream, current tabs).
- Public share pages are `noindex`.
- Do not require a new storage bucket; logo assets are URL fields.
- Vercel production must run the migration before or with the deploy so the app does not query missing columns.
