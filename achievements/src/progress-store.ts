import { ACHIEVEMENT_ORDER, type AchievementId, type AchievementProgress } from './achievement-types';

const STORAGE_KEY = 'ghfrc-achievements:v1';
const STORAGE_VERSION = 1;
const achievementIds = new Set<string>(ACHIEVEMENT_ORDER);

interface PersistedAchievementProgress {
  presentedAchievementIds: AchievementId[];
  unlockedAchievementIds: AchievementId[];
  version: typeof STORAGE_VERSION;
  visitedSectionKeys: string[];
}

export interface AchievementProgressStore {
  load: () => AchievementProgress;
  save: (progress: AchievementProgress) => void;
}

function createEmptyProgress(): AchievementProgress {
  return {
    presentedAchievementIds: new Set(),
    unlockedAchievementIds: new Set(),
    visitedSectionKeys: new Set(),
  };
}

function cloneProgress(progress: AchievementProgress): AchievementProgress {
  return {
    presentedAchievementIds: new Set(progress.presentedAchievementIds),
    unlockedAchievementIds: new Set(progress.unlockedAchievementIds),
    visitedSectionKeys: new Set(progress.visitedSectionKeys),
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseProgress(rawValue: string | null): AchievementProgress | undefined {
  if (!rawValue) {
    return undefined;
  }

  try {
    const value: unknown = JSON.parse(rawValue);

    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== STORAGE_VERSION ||
      !('visitedSectionKeys' in value) ||
      !isStringArray(value.visitedSectionKeys) ||
      !('unlockedAchievementIds' in value) ||
      !isStringArray(value.unlockedAchievementIds) ||
      !('presentedAchievementIds' in value) ||
      !isStringArray(value.presentedAchievementIds)
    ) {
      return undefined;
    }

    if (
      !value.unlockedAchievementIds.every((id) => achievementIds.has(id)) ||
      !value.presentedAchievementIds.every((id) => achievementIds.has(id))
    ) {
      return undefined;
    }

    const unlockedAchievementIds = new Set(value.unlockedAchievementIds as AchievementId[]);
    const presentedAchievementIds = new Set(value.presentedAchievementIds as AchievementId[]);

    if ([...presentedAchievementIds].some((id) => !unlockedAchievementIds.has(id))) {
      return undefined;
    }

    return {
      presentedAchievementIds,
      unlockedAchievementIds,
      visitedSectionKeys: new Set(value.visitedSectionKeys.filter((key) => key.trim().length > 0)),
    };
  } catch {
    return undefined;
  }
}

export function createAchievementProgressStore(
  storage: Storage | undefined,
): AchievementProgressStore {
  let memoryProgress = createEmptyProgress();

  return {
    load: () => {
      try {
        const storedProgress = parseProgress(storage?.getItem(STORAGE_KEY) ?? null);

        if (storedProgress) {
          memoryProgress = storedProgress;
        }
      } catch {
        // Storage can be unavailable in private browsing or under strict privacy settings.
      }

      return cloneProgress(memoryProgress);
    },
    save: (progress) => {
      memoryProgress = cloneProgress(progress);
      const persistedProgress: PersistedAchievementProgress = {
        presentedAchievementIds: ACHIEVEMENT_ORDER.filter((id) =>
          progress.presentedAchievementIds.has(id),
        ),
        unlockedAchievementIds: ACHIEVEMENT_ORDER.filter((id) =>
          progress.unlockedAchievementIds.has(id),
        ),
        version: STORAGE_VERSION,
        visitedSectionKeys: [...progress.visitedSectionKeys].sort(),
      };

      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(persistedProgress));
      } catch {
        // The in-memory copy keeps the current page functional when persistence fails.
      }
    },
  };
}
