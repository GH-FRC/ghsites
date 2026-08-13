import type { AchievementId } from './achievement-types';
import type { AchievementPresentationCoordinator } from './notification-queue';

type BrowserWindow = Window & typeof globalThis;

interface LockManagerLike {
  request: <Result>(
    name: string,
    callback: () => Promise<Result> | Result,
  ) => Promise<Result>;
}

interface LocalLockState {
  locked: boolean;
  waiters: Array<() => void>;
}

const localLocks = new Map<string, LocalLockState>();

async function acquireLocalLock(lockName: string): Promise<() => void> {
  const state = localLocks.get(lockName) ?? { locked: false, waiters: [] };
  localLocks.set(lockName, state);

  if (state.locked) {
    await new Promise<void>((resolve) => state.waiters.push(resolve));
  }

  state.locked = true;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    const nextWaiter = state.waiters.shift();

    if (nextWaiter) {
      nextWaiter();
    } else {
      state.locked = false;
      localLocks.delete(lockName);
    }
  };
}

async function runWithLocalLock<Result>(
  lockName: string,
  task: () => Promise<Result> | Result,
): Promise<Result> {
  const releaseLock = await acquireLocalLock(lockName);

  try {
    return await task();
  } finally {
    releaseLock();
  }
}

export function createAchievementPresentationCoordinator(
  windowRef: BrowserWindow,
): AchievementPresentationCoordinator {
  const lockManager = (windowRef.navigator as Navigator & { locks?: LockManagerLike }).locks;

  return {
    runExclusive: (achievementId: AchievementId, task) => {
      const lockName = `ghfrc-achievement-presentation:${achievementId}`;
      return runWithLocalLock(lockName, () =>
        lockManager ? lockManager.request(lockName, task) : task(),
      );
    },
  };
}
