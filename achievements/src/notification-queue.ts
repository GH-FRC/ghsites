import type { AchievementId } from './achievement-types';

export interface AchievementNotificationTimings {
  enterMs: number;
  exitMs: number;
  visibleMs: number;
}

export const DEFAULT_NOTIFICATION_TIMINGS: AchievementNotificationTimings = {
  enterMs: 350,
  exitMs: 350,
  visibleMs: 6_000,
};

export interface PreparedAchievementSound {
  dispose: () => void;
  start: () => void;
}

export interface AchievementSoundPlayer {
  destroy: () => void;
  prepare: (options?: { userActivation?: boolean }) => Promise<PreparedAchievementSound>;
}

export interface AchievementPresentationCoordinator {
  runExclusive: <Result>(
    achievementId: AchievementId,
    task: () => Promise<Result> | Result,
  ) => Promise<Result>;
}

interface AchievementNotificationQueueOptions {
  document: Document;
  isPresented: (achievementId: AchievementId) => boolean;
  onPresented: (achievementId: AchievementId) => void;
  presentationCoordinator: AchievementPresentationCoordinator;
  soundPlayer: AchievementSoundPlayer;
  timings?: AchievementNotificationTimings;
  notificationLanguage: string;
  notificationText: string;
  window: Window & typeof globalThis;
}

export interface AchievementNotificationQueue {
  destroy: () => void;
  enqueue: (achievementIds: AchievementId[]) => void;
}

function createToast(
  documentRef: Document,
  achievementId: AchievementId,
  notificationLanguage: string,
  notificationText: string,
  timings: AchievementNotificationTimings,
): HTMLElement {
  const toast = documentRef.createElement('div');
  toast.className = 'ghfrc-achievement-toast';
  toast.dataset.achievementId = achievementId;
  toast.dataset.state = 'entering';
  toast.dataset.achievementToast = '';
  toast.setAttribute('aria-hidden', 'true');
  toast.style.setProperty('--ghfrc-achievement-enter-duration', `${timings.enterMs}ms`);
  toast.style.setProperty('--ghfrc-achievement-exit-duration', `${timings.exitMs}ms`);

  const icon = documentRef.createElement('span');
  icon.className = 'ghfrc-achievement-toast__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.dataset.achievementPlaceholderIcon = '';
  icon.textContent = '✓';

  const copy = documentRef.createElement('span');
  copy.className = 'ghfrc-achievement-toast__copy';
  copy.lang = notificationLanguage;
  copy.textContent = notificationText;

  toast.append(icon, copy);
  return toast;
}

export function createAchievementNotificationQueue({
  document: documentRef,
  isPresented,
  onPresented,
  presentationCoordinator,
  soundPlayer,
  timings = DEFAULT_NOTIFICATION_TIMINGS,
  notificationLanguage,
  notificationText,
  window: windowRef,
}: AchievementNotificationQueueOptions): AchievementNotificationQueue {
  const queuedAchievementIds: AchievementId[] = [];
  const timeoutIds = new Set<number>();
  let activeAchievementId: AchievementId | undefined;
  let activePreparedSound: PreparedAchievementSound | undefined;
  let destroyed = false;
  const preparationsInProgress = new Set<symbol>();

  const schedule = (callback: () => void, delayMs: number) => {
    const timeoutId = windowRef.setTimeout(() => {
      timeoutIds.delete(timeoutId);
      callback();
    }, delayMs);
    timeoutIds.add(timeoutId);
  };

  const attemptPresentation = async (userActivation = false) => {
    if (
      destroyed ||
      activeAchievementId ||
      queuedAchievementIds.length === 0 ||
      (!userActivation && preparationsInProgress.size > 0)
    ) {
      return;
    }

    const preparationToken = Symbol('achievement-sound-preparation');
    preparationsInProgress.add(preparationToken);
    const achievementId = queuedAchievementIds[0];
    let shouldAttemptNext = false;

    try {
      const preparedSound = await soundPlayer.prepare({ userActivation });

      if (destroyed || queuedAchievementIds[0] !== achievementId) {
        preparedSound.dispose();
        return;
      }

      let committed = false;

      await presentationCoordinator.runExclusive(achievementId, () => {
        if (
          destroyed ||
          activeAchievementId ||
          queuedAchievementIds[0] !== achievementId
        ) {
          return;
        }

        if (isPresented(achievementId)) {
          queuedAchievementIds.shift();
          return;
        }

        const toast = createToast(
          documentRef,
          achievementId,
          notificationLanguage,
          notificationText,
          timings,
        );
        documentRef.body.append(toast);
        // Commit the off-screen state before starting the paired sound and reveal.
        toast.getBoundingClientRect();

        try {
          preparedSound.start();
        } catch {
          toast.remove();
          return;
        }

        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('role', 'status');
        toast.removeAttribute('aria-hidden');
        toast.dataset.state = 'visible';
        queuedAchievementIds.shift();
        activeAchievementId = achievementId;
        activePreparedSound = preparedSound;
        committed = true;
        onPresented(achievementId);

        schedule(() => {
          if (destroyed) {
            return;
          }

          toast.dataset.state = 'exiting';
          schedule(() => {
            toast.remove();
            preparedSound.dispose();
            activeAchievementId = undefined;
            activePreparedSound = undefined;
            void attemptPresentation();
          }, timings.exitMs);
        }, timings.enterMs + timings.visibleMs);
      });

      if (!committed) {
        preparedSound.dispose();
        shouldAttemptNext = queuedAchievementIds[0] !== achievementId;
      }
    } catch {
      // A blocked or unavailable sound leaves the paired notification pending.
    } finally {
      preparationsInProgress.delete(preparationToken);

      if (shouldAttemptNext) {
        void attemptPresentation();
      }
    }
  };

  const handleActivation = () => {
    void attemptPresentation(true);
  };
  const activationEvents = ['click', 'keydown', 'pointerdown', 'touchstart'] as const;

  activationEvents.forEach((eventName) =>
    windowRef.addEventListener(eventName, handleActivation, { passive: true }),
  );

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      queuedAchievementIds.length = 0;
      timeoutIds.forEach((timeoutId) => windowRef.clearTimeout(timeoutId));
      timeoutIds.clear();
      activePreparedSound?.dispose();
      activePreparedSound = undefined;
      activeAchievementId = undefined;
      activationEvents.forEach((eventName) =>
        windowRef.removeEventListener(eventName, handleActivation),
      );
      documentRef.querySelectorAll('[data-achievement-toast]').forEach((toast) => toast.remove());
      soundPlayer.destroy();
    },
    enqueue: (achievementIds) => {
      achievementIds.forEach((achievementId) => {
        if (
          achievementId !== activeAchievementId &&
          !queuedAchievementIds.includes(achievementId)
        ) {
          queuedAchievementIds.push(achievementId);
        }
      });
      void attemptPresentation();
    },
  };
}
