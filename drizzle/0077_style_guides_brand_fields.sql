-- Expand style_guides into a full brand book without dropping story-oriented columns.

ALTER TABLE "public"."style_guides"
  ADD COLUMN IF NOT EXISTS "title" text,
  ADD COLUMN IF NOT EXISTS "client_or_brand_name" text,
  ADD COLUMN IF NOT EXISTS "tagline" text,
  ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "share_token" text,
  ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL,
  ADD COLUMN IF NOT EXISTS "mission_statement" text,
  ADD COLUMN IF NOT EXISTS "value_propositions" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "target_audiences" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "tone_attributes" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "writing_rules" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "preferred_vocabulary" text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "banned_words" text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "color_palette" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "typography" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "logo_assets" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "imagery_guidelines" text,
  ADD COLUMN IF NOT EXISTS "social_channels" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "legal_disclaimers" text;

UPDATE "public"."style_guides"
SET
  "title" = COALESCE(NULLIF("title", ''), "name"),
  "client_or_brand_name" = COALESCE(NULLIF("client_or_brand_name", ''), "name")
WHERE "title" IS NULL OR "title" = '' OR "client_or_brand_name" IS NULL OR "client_or_brand_name" = '';

ALTER TABLE "public"."style_guides"
  ALTER COLUMN "title" SET DEFAULT '',
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "client_or_brand_name" SET DEFAULT '',
  ALTER COLUMN "client_or_brand_name" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'style_guides_share_token_unique'
      AND conrelid = 'public.style_guides'::regclass
  ) THEN
    ALTER TABLE "public"."style_guides"
      ADD CONSTRAINT "style_guides_share_token_unique" UNIQUE ("share_token");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'style_guides_status_check'
      AND conrelid = 'public.style_guides'::regclass
  ) THEN
    ALTER TABLE "public"."style_guides"
      ADD CONSTRAINT "style_guides_status_check"
      CHECK ("status" IN ('draft', 'active', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'style_guides'
      AND policyname = 'style_guides_select_public_share'
  ) THEN
    CREATE POLICY "style_guides_select_public_share"
      ON "public"."style_guides"
      FOR SELECT
      USING ("is_public" = true AND "share_token" IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dictionary_entries'
      AND policyname = 'dictionary_entries_select_public_share'
  ) THEN
    CREATE POLICY "dictionary_entries_select_public_share"
      ON "public"."dictionary_entries"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.style_guides sg
          WHERE sg.id = style_guide_id
            AND sg.is_public = true
            AND sg.share_token IS NOT NULL
        )
      );
  END IF;
END $$;
