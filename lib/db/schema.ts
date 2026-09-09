import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, pgSchema, jsonb, integer, numeric, boolean } from "drizzle-orm/pg-core";
import type {
  ColorSwatch,
  LogoAsset,
  SocialChannels,
  TargetAudience,
  TypographySpec,
  ValueProposition,
  WritingRule,
} from "../style-guide/types";

// Define the auth schema to reference auth.users
const authSchema = pgSchema("auth");

// Define authUsers table reference for auth.users
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// Public users table for profile data
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  preferences: jsonb("preferences").default({}),
  analytics: jsonb("analytics").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const styleGuides = pgTable("style_guides", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),

  // Metadata & Permissions
  title: text("title").notNull().default(""),
  clientOrBrandName: text("client_or_brand_name").notNull().default(""),
  tagline: text("tagline"),
  isPublic: boolean("is_public").default(false).notNull(),
  shareToken: text("share_token").unique(),
  status: text("status").$type<"draft" | "active" | "archived">().default("draft").notNull(),

  // Core Attributes
  toneId: text("tone_id"),
  writingStyleId: text("writing_style_id"),
  perspectiveId: text("perspective_id"),

  // Enhanced Attributes
  toneDescription: text("tone_description"),
  complexityLevel: text("complexity_level"),

  // Core Narrative & Positioning
  missionStatement: text("mission_statement"),
  valuePropositions: jsonb("value_propositions").$type<ValueProposition[]>().default([]),
  targetAudiences: jsonb("target_audiences").$type<TargetAudience[]>().default([]),

  // Brand Voice & Copywriting
  toneAttributes: jsonb("tone_attributes").$type<string[]>().default([]),
  writingRules: jsonb("writing_rules").$type<WritingRule[]>().default([]),
  preferredVocabulary: text("preferred_vocabulary")
    .array()
    .$type<string[]>()
    .default(sql`ARRAY[]::text[]`),
  bannedWords: text("banned_words")
    .array()
    .$type<string[]>()
    .default(sql`ARRAY[]::text[]`),

  // Visual Identity & Creative Specs
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  tertiaryColor: text("tertiary_color"),
  accentColor: text("accent_color"),
  fontHeading: text("font_heading"),
  fontBody: text("font_body"),
  colorPalette: jsonb("color_palette").$type<ColorSwatch[]>().default([]),
  typography: jsonb("typography").$type<TypographySpec>().default({}),
  logoAssets: jsonb("logo_assets").$type<LogoAsset[]>().default([]),
  imageryGuidelines: text("imagery_guidelines"),

  // Advertising & Channel-Specific Guardrails
  socialChannels: jsonb("social_channels").$type<SocialChannels>().default({}),
  legalDisclaimers: text("legal_disclaimers"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dictionaryEntries = pgTable("dictionary_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  styleGuideId: uuid("style_guide_id")
    .notNull()
    .references(() => styleGuides.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  definition: text("definition"),
  usageGuidelines: text("usage_guidelines"),
  category: text("category"),
  termType: text("term_type"),
  importance: text("importance"),
  usageFrequency: text("usage_frequency"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  storyType: jsonb("story_type"),
  hooks: jsonb("hooks"), // Stores the complete hook object (generated options, selection, etc.)
  mode: text("mode").$type<"quick" | "comprehensive">(), // "quick" | "comprehensive"
  modeSwitchHistory: jsonb("mode_switch_history"),
  moralConflictPrimary: text("moral_conflict_primary"),
  moralConflictSecondary: text("moral_conflict_secondary"),
  moralComplexity: text("moral_complexity").$type<"simple" | "two_rights" | "lesser_evil">(),
  moralData: jsonb("moral_data").default({}),
  character: jsonb("character"), // Stores full archetype data: primary, secondary, journey, etc.
  structure: jsonb("structure"), // Stores guidance level, selected structure, beats, etc.
  
  // Visuals
  illustrations: jsonb("illustrations").default([]), // Array of base64 images or URLs
  
  // Review & Export
  draftContent: jsonb("draft_content"), // The full story draft (TipTap JSON or similar)
  language: text("language").default("en"), // 'en', 'de', 'th'
  stylePreferences: jsonb("style_preferences").default({}), // { tone, style, perspective, customInstructions }
  exportCount: integer("export_count").default(0),
  lastExportDate: timestamp("last_export_date", { withTimezone: true }),
  lastExportFormat: text("last_export_format"),
  exportHistory: jsonb("export_history").default([]), // Array of past export events
  styleGuideId: uuid("style_guide_id").references(() => styleGuides.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scenes = pgTable("scenes", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  duration: numeric("duration"), // Estimated minutes or percentage
  tension: integer("tension"), // 1-10
  emotion: text("emotion"),
  mapPositionX: numeric("map_position_x"),
  mapPositionY: numeric("map_position_y"),
  cardWidthPercent: numeric("card_width_percent").default("10.0"),
  visualStyle: jsonb("visual_style").default({}),

  // New fields for Scene Development Tool
  structureBeat: text("structure_beat"),
  templateType: text("template_type"),
  movieTimeAction: jsonb("movie_time_action").default({}),
  movieTimeEmotion: jsonb("movie_time_emotion").default({}),
  movieTimeMeaning: jsonb("movie_time_meaning").default({}),
  sceneContent: text("scene_content"),
  aiDraftVersions: jsonb("ai_draft_versions").default([]),
  userNotes: text("user_notes"),
  completenessStatus: text("completeness_status").default("empty"),
  lastFeedback: jsonb("last_feedback"),
  showTellScore: integer("show_tell_score"),
  durationEstimate: text("duration_estimate"),
  wordCount: integer("word_count").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const storyMaps = pgTable("story_maps", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id")
    .notNull()
    .unique()
    .references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  
  // View Settings
  currentView: text("current_view").default("timeline"), // 'timeline', 'arc', 'characters'
  zoomLevel: numeric("zoom_level").default("1.0"),
  panPosition: jsonb("pan_position").default({ x: 0, y: 0 }),
  
  // Structure Overlay Settings
  structureOverlayVisible: boolean("structure_overlay_visible").default(true),
  structureViewType: text("structure_view_type"),
  overlayOpacity: numeric("overlay_opacity").default("0.7"),
  
  // Scene Layout (for custom positioning)
  scenePositions: jsonb("scene_positions").default({}),
  
  // Filter State
  activeFilters: jsonb("active_filters").default([]),
  
  // Character Track Settings
  visibleCharacters: jsonb("visible_characters").default([]),
  characterTrackOrder: jsonb("character_track_order").default([]),
  
  // Emotional Arc Settings
  arcSmoothing: boolean("arc_smoothing").default(true),
  showAverageLine: boolean("show_average_line").default(true),
  arcColorScheme: text("arc_color_scheme").default("gradient"),
  
  // AI Analysis
  lastAnalysis: jsonb("last_analysis"),
  analysisVersion: integer("analysis_version").default(1),
  analysisTimestamp: timestamp("analysis_timestamp", { withTimezone: true }),
  
  // Export Settings
  lastExportSettings: jsonb("last_export_settings"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Archetype Analytics Tracking
export const archetypeAnalytics = pgTable("archetype_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => authUsers.id),
  primaryArchetype: text("primary_archetype").notNull(),
  secondaryArchetype: text("secondary_archetype"),
  storyType: text("story_type"),
  selectionMethod: text("selection_method"), // 'grid' | 'ai-suggested' | 'deep-builder'
  hasJourney: boolean("has_journey").default(false),
  hasDarkSides: boolean("has_dark_sides").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const structureAnalytics = pgTable("structure_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => authUsers.id),
  structureId: text("structure_id").notNull(),
  guidanceLevel: text("guidance_level").$type<"deep" | "light">(),
  storyType: text("story_type"),
  selectionMethod: text("selection_method").$type<"manual" | "ai-recommended">(),
  beatsCompleted: integer("beats_completed").default(0),
  totalBeats: integer("total_beats"),
  timeSpentSeconds: integer("time_spent_seconds"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** Per-user AI generation credit balance and monthly quota tracking. */
export const userCredits = pgTable("user_credits", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(140),
  monthlyFreeQuota: integer("monthly_free_quota").notNull().default(140),
  monthlyUsed: integer("monthly_used").notNull().default(0),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Immutable audit ledger for credit mutations. */
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  type: text("type").$type<"debit" | "refill" | "admin_grant">().notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  requestId: text("request_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Public feedback submissions (admin-readable in app). */
export const feedbackSubmissions = pgTable("feedback_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  submittedBy: uuid("submitted_by").references(() => authUsers.id, { onDelete: "set null" }),
  email: text("email"),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Signed-in support assistant sessions. */
export const supportSessions = pgTable("support_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("IT support session"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Messages for support sessions (user + assistant). */
export const supportMessages = pgTable("support_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => supportSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Admin-managed SEO metadata overrides per page key. */
export const siteMetadata = pgTable("site_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageKey: text("page_key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  updatedBy: uuid("updated_by").references(() => authUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Public marketing blog posts (markdown body). */
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  canonicalUrl: text("canonical_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  authorId: uuid("author_id").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
