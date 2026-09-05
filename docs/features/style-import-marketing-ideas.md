# Feature Name
Style Import Marketing and Advertisement Ideas

## Goal
After a user provides a text sample, document, or URL in Choose New Style / AI Import, the app should return ready-to-use marketing and advertisement ideas grounded in that content, not only tone and writing-style labels.

## User Story
As a marketer or storyteller, I want to paste copy, upload a document, or provide a URL when creating a new style guide, so that I immediately get campaign and advertisement ideas I can apply to the style guide and later stories.

## Functional Requirements
1. The existing AI Import inputs remain: Upload Document (PDF, DOCX, TXT), From URL, and Paste Text.
2. Each successful analysis must return 4–8 marketing and advertisement ideas in addition to the current style fields (tone, writing style, perspective, complexity, description, dictionary terms).
3. Each idea must include a title, channel, headline, concept, and call to action.
4. Ideas must be grounded in the submitted content (product, audience, offer, proof, and voice) rather than generic filler.
5. The results panel must show marketing and advertisement ideas as a primary section after analysis completes.
6. Apply All must save style settings, dictionary terms, and a formatted marketing-ideas block into the style guide `toneDescription`.
7. Apply Settings Only must save style fields without dictionary terms or marketing ideas.
8. Users can copy a single idea or all ideas to the clipboard.
9. Creating **New Style Guide** must open that guide on the AI Import tab so the first step is providing source content.
10. Existing auth, file-size, minimum-length, and error handling for document/URL/text analysis stay in place.

## Data Requirements
- No new database tables.
- Reuse `style_guides.tone_description` to persist applied marketing ideas as formatted text.
- Analysis payload extends the existing `StyleAnalysisResult` JSON with a `marketingIdeas` array (ephemeral until the user applies it).

## User Flow
1. User clicks **New Style Guide**.
2. App creates a guide and opens the editor on **AI Import**.
3. User uploads a document, pastes a URL, or pastes text (minimum 100 characters).
4. User runs analysis.
5. App parses the source, analyzes style, and generates marketing and advertisement ideas.
6. User reviews ideas and style settings.
7. User copies ideas and/or clicks **Apply All**.
8. User saves the style guide; later story generation can use the saved voice and ideas.

## Acceptance Criteria
- Paste Text, Upload Document, and From URL each return marketing and advertisement ideas when analysis succeeds.
- Results UI shows idea title, channel, headline, concept, and CTA.
- Apply All writes ideas into `toneDescription`; Apply Settings Only does not.
- Copy actions place idea text on the clipboard.
- New Style Guide lands on AI Import.
- Failed or too-short input still shows the current error states and does not invent ideas.

## Edge Cases
- Source content has no obvious product or offer: generate brand-story and awareness ideas instead of hard-sell ads.
- Analysis JSON omits `marketingIdeas`: show style results and an empty-ideas message, do not crash.
- Clipboard permission denied: fail quietly without blocking apply/save.
- PDF parsing unavailable: keep the existing DOCX/TXT/paste fallback error.
- Duplicate Apply All: avoid stacking an identical marketing-ideas block if one is already present.

## Non-Functional Requirements
- One AI call per analysis (ideas included in the same JSON response) to avoid extra latency and cost.
- Keep the current 10MB file cap and ~50k character analysis limit.
- Preserve existing AI Import contrast/readability styles.
