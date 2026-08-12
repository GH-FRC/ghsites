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
  prepare: () => Promise<PreparedAchievementSound>;
}

interface AchievementNotificationQueueOptions {
  document: Document;
  onPresented: (achievementId: AchievementId) => void;
  soundPlayer: AchievementSoundPlayer;
  timings?: AchievementNotificationTimings;
  window: Window & typeof globalThis;
}

export interface AchievementNotificationQueue {
  destroy: () => void;
  enqueue: (achievementIds: AchievementId[]) => void;
}

function createToast(documentRef: Document, achievementId: AchievementId): HTMLElement {
  const toast = documentRef.createElement('div');
  toast.className = 'ghfrc-achievement-toast';
  toast.dataset.achievementId = achievementId;
  toast.dataset.state = 'entering';
  toast.dataset.achievementToast = '';
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  toast.setAttribute('role', 'status');

  const icon = documentRef.createElement('span');
  icon.className = 'ghfrc-achievement-toast__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.dataset.achievementPlaceholderIcon = '';
  icon.textContent = '✓';

  const copy = documentRef.createElement('span');
  copy.className = 'ghfrc-achievement-toast__copy';
  copy.textContent = '成就已解锁';

  toast.append(icon, copy);
  return toast;
}

export function createAchievementNotificationQueue({
  document: documentRef,
  onPresented,
  soundPlayer,
  timings = DEFAULT_NOTIFICATION_TIMINGS,
  window: windowRef,
}: AchievementNotificationQueueOptions): AchievementNotificationQueue {
  const queuedAchievementIds: AchievementId[] = [];
  const timeoutIds = new Set<number>();
  let activeAchievementId: AchievementId | undefined;
  let activePreparedSound: PreparedAchievementSound | undefined;
  let destroyed = false;
  let preparationInProgress = false;

  const schedule = (callback: () => void, delayMs: number) => {
    const timeoutId = windowRef.setTimeout(() => {
      timeoutIds.delete(timeoutId);
      callback();
    }, delayMs);
    timeoutIds.add(timeoutId);
  };

  const attemptPresentation = async () => {
    if (
      destroyed ||
      preparationInProgress ||
      activeAchievementId ||
      queuedAchievementIds.length === 0
    ) {
      return;
    }

    preparationInProgress = true;
    const achievementId = queuedAchievementIds[0];

    try {
      const preparedSound = await soundPlayer.prepare();

      if (destroyed || queuedAchievementIds[0] !== achievementId) {
        preparedSound.dispose();
        return;
      }

      const toast = createToast(documentRef, achievementId);
      documentRef.body.append(toast);
      // Commit the off-screen state before starting the transition and paired sound.
      toast.getBoundingClientRect();
      toast.dataset.state = 'visible';

      try {
        preparedSound.start();
      } catch {
        toast.remove();
        preparedSound.dispose();
        return;
      }

      queuedAchievementIds.shift();
      activeAchievementId = achievementId;
      activePreparedSound = preparedSound;
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
    } catch {
      // A blocked or unavailable sound leaves the paired notification pending.
    } finally {
      preparationInProgress = false;
    }
  };

  const handleActivation = () => {
    void attemptPresentation();
  };
  const activationEvents = ['click', 'keydown', 'pointerdown', 'touchstart'] as const;

  activationEvents.forEach((eventName) =>
    windowRef.addEventListener(eventName, handleActivation, { passive: true }),
  );

  return {
    destroy: () => {
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
