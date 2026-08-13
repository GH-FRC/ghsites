import { ACHIEVEMENT_ORDER, type AchievementId, type AchievementProgress } from './achievement-types';

export const ACHIEVEMENT_STORAGE_PREFIX = 'ghfrc-achievements:v1';
const STORAGE_KEY = ACHIEVEMENT_STORAGE_PREFIX;
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
  save: (progress: AchievementProgress) => AchievementProgress;
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

function mergeProgress(...progressRecords: AchievementProgress[]): AchievementProgress {
  const mergedProgress = createEmptyProgress();

  progressRecords.forEach((progress) => {
    progress.presentedAchievementIds.forEach((id) =>
      mergedProgress.presentedAchievementIds.add(id),
    );
    progress.unlockedAchievementIds.forEach((id) =>
      mergedProgress.unlockedAchievementIds.add(id),
    );
    progress.visitedSectionKeys.forEach((key) => mergedProgress.visitedSectionKeys.add(key));
  });
  mergedProgress.presentedAchievementIds.forEach((id) =>
    mergedProgress.unlockedAchievementIds.add(id),
  );
  return mergedProgress;
}

function factKey(category: 'presented' | 'unlocked' | 'visited', value: string): string {
  return `${ACHIEVEMENT_STORAGE_PREFIX}:${category}:${encodeURIComponent(value)}`;
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
  knownSectionKeys: Iterable<string> = [],
): AchievementProgressStore {
  let memoryProgress = createEmptyProgress();
  const sectionKeys = new Set(knownSectionKeys);

  const load = () => {
    let storedProgress = createEmptyProgress();

    try {
      storedProgress = parseProgress(storage?.getItem(STORAGE_KEY) ?? null) ?? storedProgress;

      ACHIEVEMENT_ORDER.forEach((achievementId) => {
        if (storage?.getItem(factKey('unlocked', achievementId)) === '1') {
          storedProgress.unlockedAchievementIds.add(achievementId);
        }

        if (storage?.getItem(factKey('presented', achievementId)) === '1') {
          storedProgress.presentedAchievementIds.add(achievementId);
          storedProgress.unlockedAchievementIds.add(achievementId);
        }
      });
      sectionKeys.forEach((sectionKey) => {
        if (storage?.getItem(factKey('visited', sectionKey)) === '1') {
          storedProgress.visitedSectionKeys.add(sectionKey);
        }
      });
    } catch {
      // Storage can be unavailable in private browsing or under strict privacy settings.
    }

    memoryProgress = mergeProgress(memoryProgress, storedProgress);
    return cloneProgress(memoryProgress);
  };

  return {
    load,
    save: (progress) => {
      memoryProgress = mergeProgress(load(), progress);
      const persistedProgress: PersistedAchievementProgress = {
        presentedAchievementIds: ACHIEVEMENT_ORDER.filter((id) =>
          memoryProgress.presentedAchievementIds.has(id),
        ),
        unlockedAchievementIds: ACHIEVEMENT_ORDER.filter((id) =>
          memoryProgress.unlockedAchievementIds.has(id),
        ),
        version: STORAGE_VERSION,
        visitedSectionKeys: [...memoryProgress.visitedSectionKeys].sort(),
      };

      try {
        memoryProgress.unlockedAchievementIds.forEach((achievementId) => {
          storage?.setItem(factKey('unlocked', achievementId), '1');
        });
        memoryProgress.presentedAchievementIds.forEach((achievementId) => {
          storage?.setItem(factKey('presented', achievementId), '1');
        });
        memoryProgress.visitedSectionKeys.forEach((sectionKey) => {
          storage?.setItem(factKey('visited', sectionKey), '1');
        });
        // Retain the aggregate record for backward compatibility and easy inspection.
        // Independent fact keys remain authoritative and prevent cross-tab lost updates.
        storage?.setItem(STORAGE_KEY, JSON.stringify(persistedProgress));
      } catch {
        // The in-memory copy keeps the current page functional when persistence fails.
      }

      return cloneProgress(memoryProgress);
    },
  };
}
