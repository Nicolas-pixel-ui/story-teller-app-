export type AdminUsageStats = {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  recentlyOnlineUsers: number;
  totalStories: number;
  totalAiGenerations: number;
  aiGenerations7d: number;
  usersWithStories: number;
  usersWithStyleGuides: number;
  usersWithBoth: number;
  usersStoriesOnly: number;
  usersStyleGuidesOnly: number;
  usersWithNeither: number;
  totalStyleGuides: number;
  storiesThatUsedStyleGuide: number;
  storyUsers7d: number;
  styleGuideUsers7d: number;
  storyAiGenerations: number;
  styleGuideAiGenerations: number;
  storyAiGenerations7d: number;
  styleGuideAiGenerations7d: number;
};

export type RecentSignup = {
  id: string;
  email: string;
  createdAt: Date;
};

export const EMPTY_ADMIN_USAGE_STATS: AdminUsageStats = {
  totalUsers: 0,
  newUsers7d: 0,
  newUsers30d: 0,
  activeUsers24h: 0,
  activeUsers7d: 0,
  activeUsers30d: 0,
  recentlyOnlineUsers: 0,
  totalStories: 0,
  totalAiGenerations: 0,
  aiGenerations7d: 0,
  usersWithStories: 0,
  usersWithStyleGuides: 0,
  usersWithBoth: 0,
  usersStoriesOnly: 0,
  usersStyleGuidesOnly: 0,
  usersWithNeither: 0,
  totalStyleGuides: 0,
  storiesThatUsedStyleGuide: 0,
  storyUsers7d: 0,
  styleGuideUsers7d: 0,
  storyAiGenerations: 0,
  styleGuideAiGenerations: 0,
  storyAiGenerations7d: 0,
  styleGuideAiGenerations7d: 0,
};

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

export function mapAdminUsageStatsRow(
  row: Record<string, unknown> | null | undefined
): AdminUsageStats {
  return {
    totalUsers: toCount(row?.total_users),
    newUsers7d: toCount(row?.new_users_7d),
    newUsers30d: toCount(row?.new_users_30d),
    activeUsers24h: toCount(row?.active_users_24h),
    activeUsers7d: toCount(row?.active_users_7d),
    activeUsers30d: toCount(row?.active_users_30d),
    recentlyOnlineUsers: toCount(row?.recently_online_users),
    totalStories: toCount(row?.total_stories),
    totalAiGenerations: toCount(row?.total_ai_generations),
    aiGenerations7d: toCount(row?.ai_generations_7d),
    usersWithStories: toCount(row?.users_with_stories),
    usersWithStyleGuides: toCount(row?.users_with_style_guides),
    usersWithBoth: toCount(row?.users_with_both),
    usersStoriesOnly: toCount(row?.users_stories_only),
    usersStyleGuidesOnly: toCount(row?.users_style_guides_only),
    usersWithNeither: toCount(row?.users_with_neither),
    totalStyleGuides: toCount(row?.total_style_guides),
    storiesThatUsedStyleGuide: toCount(row?.stories_that_used_style_guide),
    storyUsers7d: toCount(row?.story_users_7d),
    styleGuideUsers7d: toCount(row?.style_guide_users_7d),
    storyAiGenerations: toCount(row?.story_ai_generations),
    styleGuideAiGenerations: toCount(row?.style_guide_ai_generations),
    storyAiGenerations7d: toCount(row?.story_ai_generations_7d),
    styleGuideAiGenerations7d: toCount(row?.style_guide_ai_generations_7d),
  };
}
