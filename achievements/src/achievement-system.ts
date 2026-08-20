import { ACHIEVEMENT_ORDER, type AchievementId, type AchievementProgress } from './achievement-types';
import {
  createAchievementNotificationQueue,
  type AchievementNotificationTimings,
  type AchievementNotificationQueue,
  type AchievementPresentationCoordinator,
  type AchievementSoundPlayer,
} from './notification-queue';
import { createAchievementPresentationCoordinator } from './presentation-coordinator';
import {
  ACHIEVEMENT_STORAGE_PREFIX,
  createAchievementProgressStore,
} from './progress-store';
import { createAchievementSoundPlayer } from './sound-player';

type BrowserWindow = Window & typeof globalThis;

export interface AchievementSystemHandle {
  destroy: () => void;
}

export interface AchievementSystemOptions {
  document?: Document;
  notificationLanguage?: string;
  notificationText?: string;
  presentationCoordinator?: AchievementPresentationCoordinator;
  soundPlayer?: AchievementSoundPlayer;
  storage?: Storage | null;
  timings?: AchievementNotificationTimings;
  window?: BrowserWindow;
}

interface AchievementSession {
  destroy: () => void;
  referenceCount: number;
}

const activeSessions = new WeakMap<Document, AchievementSession>();

function resolveStorage(windowRef: BrowserWindow, explicitStorage?: Storage | null): Storage | undefined {
  if (explicitStorage !== undefined) {
    return explicitStorage ?? undefined;
  }

  try {
    return windowRef.localStorage;
  } catch {
    return undefined;
  }
}

function synchronizeProgress(
  target: AchievementProgress,
  source: AchievementProgress,
): void {
  target.presentedAchievementIds = new Set(source.presentedAchievementIds);
  target.unlockedAchievementIds = new Set(source.unlockedAchievementIds);
  target.visitedSectionKeys = new Set(source.visitedSectionKeys);
}

function createAchievementSession(options: AchievementSystemOptions): AchievementSession {
  const documentRef = options.document ?? document;
  const windowRef = options.window ?? window;
  const trackedSections = [
    ...documentRef.querySelectorAll<HTMLElement>('[data-achievement-section]'),
  ].filter((section) => (section.dataset.achievementSection ?? '').trim().length > 0);
  const requiredSectionKeys = new Set(
    trackedSections.map((section) => section.dataset.achievementSection!.trim()),
  );
  const storage = resolveStorage(windowRef, options.storage);
  const store = createAchievementProgressStore(storage, requiredSectionKeys);
  const progress = store.load();
  const soundPlayer = options.soundPlayer ?? createAchievementSoundPlayer(windowRef);
  const presentationCoordinator =
    options.presentationCoordinator ?? createAchievementPresentationCoordinator(windowRef);
  let notificationQueue: AchievementNotificationQueue;
  let sectionObserver: IntersectionObserver | undefined;
  let destroyed = false;

  const refreshProgress = () => {
    synchronizeProgress(progress, store.load());
  };

  const saveProgress = () => {
    synchronizeProgress(progress, store.save(progress));
  };

  const savePresentedAchievement = (achievementId: AchievementId) => {
    refreshProgress();
    progress.presentedAchievementIds.add(achievementId);
    progress.unlockedAchievementIds.add(achievementId);
    saveProgress();
  };

  notificationQueue = createAchievementNotificationQueue({
    document: documentRef,
    isPresented: (achievementId) => {
      refreshProgress();
      return progress.presentedAchievementIds.has(achievementId);
    },
    onPresented: savePresentedAchievement,
    notificationLanguage: options.notificationLanguage ?? 'zh-CN',
    notificationText: options.notificationText ?? '成就已解锁',
    presentationCoordinator,
    soundPlayer,
    timings: options.timings,
    window: windowRef,
  });

  const enqueuePendingAchievements = () => {
    refreshProgress();
    notificationQueue.enqueue(
      ACHIEVEMENT_ORDER.filter(
        (achievementId) =>
          progress.unlockedAchievementIds.has(achievementId) &&
          !progress.presentedAchievementIds.has(achievementId),
      ),
    );
  };

  const unlockAllSectionsIfComplete = () => {
    refreshProgress();

    if (progress.unlockedAchievementIds.has('all-sections-visited')) {
      sectionObserver?.disconnect();
      return;
    }

    if (
      requiredSectionKeys.size === 0 ||
      [...requiredSectionKeys].some((sectionKey) => !progress.visitedSectionKeys.has(sectionKey))
    ) {
      return;
    }

    progress.unlockedAchievementIds.add('all-sections-visited');
    saveProgress();
    sectionObserver?.disconnect();
    enqueuePendingAchievements();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea && storage && event.storageArea !== storage) {
      return;
    }

    if (event.key && !event.key.startsWith(ACHIEVEMENT_STORAGE_PREFIX)) {
      return;
    }

    refreshProgress();
    unlockAllSectionsIfComplete();
    enqueuePendingAchievements();
  };

  windowRef.addEventListener('storage', handleStorage);

  if (!progress.unlockedAchievementIds.has('first-visit')) {
    progress.unlockedAchievementIds.add('first-visit');
    saveProgress();
  }

  enqueuePendingAchievements();

  if (
    !progress.unlockedAchievementIds.has('all-sections-visited') &&
    trackedSections.length > 0 &&
    typeof windowRef.IntersectionObserver === 'function'
  ) {
    sectionObserver = new windowRef.IntersectionObserver(
      (entries) => {
        let progressChanged = false;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const sectionKey = entry.target.getAttribute('data-achievement-section')?.trim();

          if (!sectionKey || !requiredSectionKeys.has(sectionKey)) {
            return;
          }

          if (!progress.visitedSectionKeys.has(sectionKey)) {
            progress.visitedSectionKeys.add(sectionKey);
            progressChanged = true;
          }
          sectionObserver?.unobserve(entry.target);
        });

        if (progressChanged) {
          saveProgress();
          unlockAllSectionsIfComplete();
        }
      },
      { threshold: 0 },
    );

    trackedSections.forEach((section) => {
      const sectionKey = section.dataset.achievementSection!.trim();

      if (!progress.visitedSectionKeys.has(sectionKey)) {
        sectionObserver?.observe(section);
      }
    });
    unlockAllSectionsIfComplete();
  }

  return {
    referenceCount: 1,
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      windowRef.removeEventListener('storage', handleStorage);
      sectionObserver?.disconnect();
      notificationQueue.destroy();
    },
  };
}

export function initializeAchievementSystem(
  options: AchievementSystemOptions = {},
): AchievementSystemHandle {
  const documentRef = options.document ?? document;
  let session = activeSessions.get(documentRef);

  if (session) {
    session.referenceCount += 1;
  } else {
    session = createAchievementSession(options);
    activeSessions.set(documentRef, session);
  }

  let released = false;
  const referencedSession = session;

  return {
    destroy: () => {
      if (released) {
        return;
      }

      released = true;
      referencedSession.referenceCount -= 1;

      if (referencedSession.referenceCount === 0) {
        referencedSession.destroy();
        activeSessions.delete(documentRef);
      }
    },
  };
}
