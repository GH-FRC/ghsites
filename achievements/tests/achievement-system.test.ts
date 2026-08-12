import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  initializeAchievementSystem,
  type AchievementSoundPlayer,
  type PreparedAchievementSound,
} from '../src';

function createTestSoundPlayer(
  prepare: () => Promise<PreparedAchievementSound>,
): AchievementSoundPlayer {
  return {
    destroy: vi.fn(),
    prepare,
  };
}

function createPreparedSound(start: () => void = vi.fn()): PreparedAchievementSound {
  return {
    dispose: vi.fn(),
    start,
  };
}

const trackedSectionKeys = [
  'page-top',
  'about-frc',
  'about-xplore',
  'about-gh-frc',
  'robots',
  'achievements',
  'news',
  'sponsors',
  'contact',
] as const;

class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0.01];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn((element: Element) => this.observedElements.add(element));
  readonly takeRecords = vi.fn(() => []);
  readonly unobserve = vi.fn((element: Element) => this.observedElements.delete(element));
  private readonly observedElements = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {
    TestIntersectionObserver.instances.push(this);
  }

  emit(sectionKeys: readonly string[]) {
    const entries = sectionKeys.map((sectionKey) => {
      const target = document.querySelector(`[data-achievement-section="${sectionKey}"]`);

      if (!target || !this.observedElements.has(target)) {
        throw new Error(`Section ${sectionKey} is not being observed.`);
      }

      return { isIntersecting: true, target } as IntersectionObserverEntry;
    });

    this.callback(entries, this);
  }
}

function renderTrackedSections(sectionKeys: readonly string[] = trackedSectionKeys) {
  document.body.innerHTML = `<main>${sectionKeys
    .map((sectionKey) => `<section data-achievement-section="${sectionKey}"></section>`)
    .join('')}</main>`;
}

describe('achievement system', () => {
  const originalAudioContext = window.AudioContext;
  const originalIntersectionObserver = window.IntersectionObserver;
  let achievementHandle: ReturnType<typeof initializeAchievementSystem> | undefined;

  beforeEach(() => {
    renderTrackedSections(['page-top']);
    window.localStorage.clear();
    TestIntersectionObserver.instances = [];
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: TestIntersectionObserver,
    });
  });

  afterEach(() => {
    achievementHandle?.destroy();
    achievementHandle = undefined;
    window.localStorage.clear();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: originalIntersectionObserver,
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: originalAudioContext,
    });
    vi.useRealTimers();
  });

  it('shows the first-visit notification only after its sound starts', async () => {
    const start = vi.fn(() => {
      expect(document.querySelector('[data-achievement-toast]')).not.toBeNull();
    });
    const prepare = vi.fn().mockResolvedValue(createPreparedSound(start));

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(prepare),
      window,
    });

    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());

    const message = document.querySelector<HTMLElement>('.ghfrc-achievement-toast__copy');
    expect(message?.textContent?.trim()).toBe('成就已解锁');
  });

  it('keeps a blocked notification hidden until an eligible interaction starts its sound', async () => {
    const start = vi.fn();
    const prepare = vi
      .fn<() => Promise<PreparedAchievementSound>>()
      .mockRejectedValueOnce(new Error('Autoplay blocked'))
      .mockResolvedValueOnce(createPreparedSound(start));

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(prepare),
      window,
    });

    await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
    await Promise.resolve();
    expect(document.querySelector('[data-achievement-toast]')).toBeNull();

    window.dispatchEvent(new PointerEvent('pointerdown'));

    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
    expect(document.querySelector('.ghfrc-achievement-toast__copy')?.textContent?.trim()).toBe(
      '成就已解锁',
    );
  });

  it('does not display a notification when the browser cannot produce its paired sound', async () => {
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: undefined,
    });

    achievementHandle = initializeAchievementSystem({ document, window });

    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('[data-achievement-toast]')).toBeNull();
  });

  it('keeps first-visit notifications functional when section observation is unavailable', async () => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: undefined,
    });
    const preparedSound = createPreparedSound();

    expect(() => {
      achievementHandle = initializeAchievementSystem({
        document,
        soundPlayer: createTestSoundPlayer(vi.fn().mockResolvedValue(preparedSound)),
        window,
      });
    }).not.toThrow();

    await vi.waitFor(() => expect(preparedSound.start).toHaveBeenCalledOnce());
  });

  it('does not notify a returning visitor after the first-visit achievement was presented', async () => {
    const firstStart = vi.fn();

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(
        vi.fn().mockResolvedValue(createPreparedSound(firstStart)),
      ),
      window,
    });
    await vi.waitFor(() => expect(firstStart).toHaveBeenCalledOnce());
    achievementHandle.destroy();

    const returningPrepare = vi.fn().mockResolvedValue(createPreparedSound());
    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(returningPrepare),
      window,
    });

    await Promise.resolve();
    expect(returningPrepare).not.toHaveBeenCalled();
    expect(document.querySelector('[data-achievement-toast]')).toBeNull();
  });

  it('restores a pending first-visit notification after the page is reopened', async () => {
    const blockedPrepare = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(blockedPrepare),
      window,
    });
    await vi.waitFor(() => expect(blockedPrepare).toHaveBeenCalledOnce());
    await Promise.resolve();
    achievementHandle.destroy();

    const resumedStart = vi.fn();
    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(
        vi.fn().mockResolvedValue(createPreparedSound(resumedStart)),
      ),
      window,
    });

    await vi.waitFor(() => expect(resumedStart).toHaveBeenCalledOnce());
    expect(document.querySelector('.ghfrc-achievement-toast__copy')?.textContent?.trim()).toBe(
      '成就已解锁',
    );
  });

  it('accumulates section visits across page visits before unlocking all-sections', async () => {
    renderTrackedSections();
    const firstStart = vi.fn();
    const firstPrepare = vi.fn().mockResolvedValue(createPreparedSound(firstStart));

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(firstPrepare),
      window,
    });
    await vi.waitFor(() => expect(firstStart).toHaveBeenCalledOnce());

    TestIntersectionObserver.instances.at(-1)!.emit(trackedSectionKeys.slice(0, 4));
    await Promise.resolve();
    expect(firstPrepare).toHaveBeenCalledOnce();
    achievementHandle.destroy();

    const completedStarts: string[] = [];
    const completedPrepare = vi.fn().mockImplementation(async () =>
      createPreparedSound(() => {
        completedStarts.push(
          document.querySelector<HTMLElement>('[data-achievement-toast]')?.dataset
            .achievementId ?? 'missing',
        );
      }),
    );
    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(completedPrepare),
      window,
    });

    TestIntersectionObserver.instances.at(-1)!.emit(trackedSectionKeys.slice(4));

    await vi.waitFor(() => expect(completedStarts).toEqual(['all-sections-visited']));
  });

  it('includes every additionally marked section in the completion requirement', async () => {
    const extendedSectionKeys = [...trackedSectionKeys, 'future-section'];
    renderTrackedSections(extendedSectionKeys);
    const prepare = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(prepare),
      window,
    });
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());

    TestIntersectionObserver.instances.at(-1)!.emit(trackedSectionKeys);
    await Promise.resolve();
    expect(prepare).toHaveBeenCalledOnce();

    TestIntersectionObserver.instances.at(-1)!.emit(['future-section']);
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
  });

  it('recovers safely when stored progress is malformed', async () => {
    const storage = {
      getItem: vi.fn(() => '{not-valid-json'),
      setItem: vi.fn(),
    } as unknown as Storage;
    const start = vi.fn();

    expect(() => {
      achievementHandle = initializeAchievementSystem({
        document,
        soundPlayer: createTestSoundPlayer(
          vi.fn().mockResolvedValue(createPreparedSound(start)),
        ),
        storage,
        window,
      });
    }).not.toThrow();

    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
    expect(storage.setItem).toHaveBeenCalled();
  });

  it('keeps the current page functional when browser storage throws', async () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('Storage disabled');
      }),
      setItem: vi.fn(() => {
        throw new Error('Quota exceeded');
      }),
    } as unknown as Storage;
    const start = vi.fn();

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(
        vi.fn().mockResolvedValue(createPreparedSound(start)),
      ),
      storage,
      window,
    });

    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
    expect(document.querySelector('.ghfrc-achievement-toast__copy')?.textContent?.trim()).toBe(
      '成就已解锁',
    );
  });

  it('presents queued achievements in unlock order after each six-second notification finishes', async () => {
    vi.useFakeTimers();
    renderTrackedSections();
    const startedAchievementIds: string[] = [];
    const prepare = vi.fn().mockImplementation(async () =>
      createPreparedSound(() => {
        startedAchievementIds.push(
          document.querySelector<HTMLElement>('[data-achievement-toast]')?.dataset
            .achievementId ?? 'missing',
        );
      }),
    );

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(prepare),
      window,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(startedAchievementIds).toEqual(['first-visit']);

    TestIntersectionObserver.instances.at(-1)!.emit(trackedSectionKeys);
    await vi.advanceTimersByTimeAsync(6_699);
    expect(startedAchievementIds).toEqual(['first-visit']);

    await vi.advanceTimersByTimeAsync(1);
    expect(startedAchievementIds).toEqual(['first-visit', 'all-sections-visited']);
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it('releases an active notification sound and observer when destroyed', async () => {
    const preparedSound = createPreparedSound();
    const soundPlayer = createTestSoundPlayer(vi.fn().mockResolvedValue(preparedSound));

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer,
      window,
    });
    await vi.waitFor(() => expect(preparedSound.start).toHaveBeenCalledOnce());
    const observer = TestIntersectionObserver.instances.at(-1)!;

    achievementHandle.destroy();

    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(preparedSound.dispose).toHaveBeenCalledOnce();
    expect(soundPlayer.destroy).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-achievement-toast]')).toBeNull();
  });

  it('renders only the fixed unlock message with a neutral decorative icon', async () => {
    const preparedSound = createPreparedSound();

    achievementHandle = initializeAchievementSystem({
      document,
      soundPlayer: createTestSoundPlayer(vi.fn().mockResolvedValue(preparedSound)),
      window,
    });
    await vi.waitFor(() => expect(preparedSound.start).toHaveBeenCalledOnce());

    const toast = document.querySelector<HTMLElement>('[data-achievement-toast]')!;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.querySelector('[data-achievement-placeholder-icon]')).not.toBeNull();
    expect(toast.querySelector('.ghfrc-achievement-toast__copy')?.textContent?.trim()).toBe(
      '成就已解锁',
    );
    expect(toast.textContent).not.toContain('Steam');
    expect(toast.textContent).not.toContain('first-visit');
  });
});
