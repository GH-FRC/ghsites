import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COLOR_SCHEME_BOOTSTRAP_SCRIPT,
  initializeColorSchemeControl,
} from '../src/scripts/color-scheme';

function runColorSchemeBootstrap() {
  const executeBootstrap = new Function(
    'window',
    'document',
    COLOR_SCHEME_BOOTSTRAP_SCRIPT,
  );

  executeBootstrap(window, document);
}

describe('color scheme pre-paint bootstrap', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-color-scheme');
  });

  afterEach(() => {
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-color-scheme');
  });

  it('applies a valid session choice before the interface initializes', () => {
    sessionStorage.setItem('ghfrc-color-scheme', 'dark');

    runColorSchemeBootstrap();

    expect(document.documentElement.dataset.colorScheme).toBe('dark');
  });

  it('removes invalid session data and leaves the system preference active', () => {
    sessionStorage.setItem('ghfrc-color-scheme', 'sepia');
    document.documentElement.dataset.colorScheme = 'light';

    runColorSchemeBootstrap();

    expect(sessionStorage.getItem('ghfrc-color-scheme')).toBeNull();
    expect(document.documentElement.dataset.colorScheme).toBeUndefined();
  });

  it('leaves the system preference active when session storage is unavailable', () => {
    document.documentElement.dataset.colorScheme = 'light';
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });

    expect(() => runColorSchemeBootstrap()).not.toThrow();
    expect(document.documentElement.dataset.colorScheme).toBeUndefined();
  });
});

describe('color scheme controls', () => {
  const originalMatchMedia = window.matchMedia;
  let interactionHandle: ReturnType<typeof initializeColorSchemeControl> | undefined;

  function installColorSchemePreference(initiallyDark: boolean) {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const colorSchemePreference = {
      matches: initiallyDark,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') listeners.add(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') listeners.delete(listener);
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) =>
        query === '(prefers-color-scheme: dark)'
          ? colorSchemePreference
          : {
              ...colorSchemePreference,
              matches: false,
              media: query,
            },
      ),
    });

    return {
      setDarkPreference(isDark: boolean) {
        colorSchemePreference.matches = isDark;
        const event = { matches: isDark } as MediaQueryListEvent;
        listeners.forEach((listener) => {
          if (typeof listener === 'function') {
            listener(event);
          } else {
            listener.handleEvent(event);
          }
        });
      },
    };
  }

  beforeEach(() => {
    interactionHandle = undefined;
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-color-scheme');
    document.body.innerHTML = `
      <button
        type="button"
        aria-label="切换至深色模式"
        data-color-scheme-toggle
        data-switch-to-dark-label="切换至深色模式"
        data-switch-to-light-label="切换至浅色模式"
      ></button>
    `;
  });

  afterEach(() => {
    interactionHandle?.destroy();
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-color-scheme');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('reflects the system dark preference when the visitor has not made a choice', () => {
    installColorSchemePreference(true);

    interactionHandle = initializeColorSchemeControl(document, window);

    const toggle = document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!;
    expect(toggle.getAttribute('aria-label')).toBe('切换至浅色模式');
    expect(document.documentElement.dataset.colorScheme).toBeUndefined();
  });

  it('lets the visitor switch modes and keeps the choice for the current session', () => {
    installColorSchemePreference(false);
    interactionHandle = initializeColorSchemeControl(document, window);

    const toggle = document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!;
    toggle.click();

    expect(document.documentElement.dataset.colorScheme).toBe('dark');
    expect(sessionStorage.getItem('ghfrc-color-scheme')).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('切换至浅色模式');

    interactionHandle.destroy();
    interactionHandle = undefined;
    document.documentElement.removeAttribute('data-color-scheme');
    runColorSchemeBootstrap();

    interactionHandle = initializeColorSchemeControl(document, window);

    expect(document.documentElement.dataset.colorScheme).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('切换至浅色模式');
  });

  it('returns to the system preference when a new browsing session starts', () => {
    installColorSchemePreference(false);
    interactionHandle = initializeColorSchemeControl(document, window);

    document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!.click();
    expect(document.documentElement.dataset.colorScheme).toBe('dark');

    interactionHandle.destroy();
    interactionHandle = undefined;
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-color-scheme');

    interactionHandle = initializeColorSchemeControl(document, window);

    expect(document.documentElement.dataset.colorScheme).toBeUndefined();
    expect(
      document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!.getAttribute('aria-label'),
    ).toBe('切换至深色模式');
  });

  it('tracks system preference changes until the visitor chooses a mode', () => {
    const systemPreference = installColorSchemePreference(false);
    interactionHandle = initializeColorSchemeControl(document, window);

    const toggle = document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!;
    systemPreference.setDarkPreference(true);
    expect(toggle.getAttribute('aria-label')).toBe('切换至浅色模式');

    toggle.click();
    systemPreference.setDarkPreference(false);
    systemPreference.setDarkPreference(true);

    expect(document.documentElement.dataset.colorScheme).toBe('light');
    expect(toggle.getAttribute('aria-label')).toBe('切换至深色模式');
  });

  it('keeps working when session storage is unavailable', () => {
    installColorSchemePreference(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });

    interactionHandle = initializeColorSchemeControl(document, window);
    document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!.click();

    expect(document.documentElement.dataset.colorScheme).toBe('dark');
  });

  it('removes its event listeners when the control is destroyed', () => {
    const systemPreference = installColorSchemePreference(false);
    interactionHandle = initializeColorSchemeControl(document, window);
    const toggle = document.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]')!;

    interactionHandle.destroy();
    interactionHandle = undefined;
    toggle.click();
    systemPreference.setDarkPreference(true);

    expect(document.documentElement.dataset.colorScheme).toBeUndefined();
    expect(toggle.getAttribute('aria-label')).toBe('切换至深色模式');
  });
});
