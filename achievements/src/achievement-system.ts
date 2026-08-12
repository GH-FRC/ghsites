import { ACHIEVEMENT_ORDER, type AchievementId } from './achievement-types';
import {
  createAchievementNotificationQueue,
  type AchievementNotificationTimings,
  type AchievementNotificationQueue,
  type AchievementSoundPlayer,
} from './notification-queue';
import { createAchievementProgressStore } from './progress-store';
import { createAchievementSoundPlayer } from './sound-player';

type BrowserWindow = Window & typeof globalThis;

export interface AchievementSystemHandle {
  destroy: () => void;
}

export interface AchievementSystemOptions {
  document?: Document;
  soundPlayer?: AchievementSoundPlayer;
  storage?: Storage | null;
  timings?: AchievementNotificationTimings;
  window?: BrowserWindow;
}

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

export function initializeAchievementSystem(
  options: AchievementSystemOptions = {},
): AchievementSystemHandle {
  const documentRef = options.document ?? document;
  const windowRef = options.window ?? window;
  const store = createAchievementProgressStore(resolveStorage(windowRef, options.storage));
  const progress = store.load();
  const soundPlayer = options.soundPlayer ?? createAchievementSoundPlayer(windowRef);
  const trackedSections = [
    ...documentRef.querySelectorAll<HTMLElement>('[data-achievement-section]'),
  ].filter((section) => (section.dataset.achievementSection ?? '').trim().length > 0);
  const requiredSectionKeys = new Set(
    trackedSections.map((section) => section.dataset.achievementSection!.trim()),
  );
  let notificationQueue: AchievementNotificationQueue;
  let sectionObserver: IntersectionObserver | undefined;

  const savePresentedAchievement = (achievementId: AchievementId) => {
    progress.presentedAchievementIds.add(achievementId);
    store.save(progress);
  };

  notificationQueue = createAchievementNotificationQueue({
    document: documentRef,
    onPresented: savePresentedAchievement,
    soundPlayer,
    timings: options.timings,
    window: windowRef,
  });

  const enqueuePendingAchievements = () => {
    notificationQueue.enqueue(
      ACHIEVEMENT_ORDER.filter(
        (achievementId) =>
          progress.unlockedAchievementIds.has(achievementId) &&
          !progress.presentedAchievementIds.has(achievementId),
      ),
    );
  };

  const unlockAllSectionsIfComplete = () => {
    if (
      progress.unlockedAchievementIds.has('all-sections-visited') ||
      requiredSectionKeys.size === 0 ||
      [...requiredSectionKeys].some((sectionKey) => !progress.visitedSectionKeys.has(sectionKey))
    ) {
      return;
    }

    progress.unlockedAchievementIds.add('all-sections-visited');
    store.save(progress);
    sectionObserver?.disconnect();
    enqueuePendingAchievements();
  };

  if (!progress.unlockedAchievementIds.has('first-visit')) {
    progress.unlockedAchievementIds.add('first-visit');
    store.save(progress);
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
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
            return;
          }

          const sectionKey = entry.target.dataset.achievementSection?.trim();

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
          store.save(progress);
          unlockAllSectionsIfComplete();
        }
      },
      { threshold: 0.01 },
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
    destroy: () => {
      sectionObserver?.disconnect();
      notificationQueue.destroy();
    },
  };
}
