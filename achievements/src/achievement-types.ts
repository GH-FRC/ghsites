export const ACHIEVEMENT_ORDER = ['first-visit', 'all-sections-visited'] as const;

export type AchievementId = (typeof ACHIEVEMENT_ORDER)[number];

export interface AchievementProgress {
  presentedAchievementIds: Set<AchievementId>;
  unlockedAchievementIds: Set<AchievementId>;
  visitedSectionKeys: Set<string>;
}
