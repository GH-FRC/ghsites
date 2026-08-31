import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeBrowserTab } from '../src/scripts/browser-tab';

afterEach(() => {
  document.head.innerHTML = '';
  vi.restoreAllMocks();
});

function setup(initiallyDark: boolean) {
  document.documentElement.removeAttribute('data-color-scheme');
  document.head.innerHTML = `
    <meta name="theme-color" content="#ffffff" data-browser-theme-color data-light-color="#ffffff" data-dark-color="#000000">
    <link rel="icon" href="/light.png" data-browser-tab-icon data-light-icon="/light.png" data-dark-icon="/dark.png">
  `;
  let dark = initiallyDark;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  Object.defineProperty(preference, 'matches', { configurable: true, get: () => dark });
  vi.spyOn(window, 'matchMedia').mockReturnValue(preference);
  const handle = initializeBrowserTab(document, window);
  return {
    handle,
    href: () => document.querySelector('link')?.getAttribute('href'),
    themeColor: () => document.querySelector('meta')?.getAttribute('content'),
    setDark(value: boolean) {
      dark = value;
      preference.dispatchEvent(new Event('change'));
    },
    setManualScheme(value?: 'light' | 'dark') {
      if (value) {
        document.documentElement.dataset.colorScheme = value;
      } else {
        document.documentElement.removeAttribute('data-color-scheme');
      }
    },
  };
}

describe('browser tab appearance', () => {
  it('uses the black icon for a light browser preference', () => {
    const tab = setup(false);
    expect(tab.href()).toBe('/light.png');
    expect(tab.themeColor()).toBe('#ffffff');
    tab.handle.destroy();
  });

  it('uses the white icon for a dark browser preference', () => {
    const tab = setup(true);
    expect(tab.href()).toBe('/dark.png');
    expect(tab.themeColor()).toBe('#000000');
    tab.handle.destroy();
  });

  it('updates in both directions when the browser preference changes', () => {
    const tab = setup(false);
    tab.setDark(true);
    expect(tab.href()).toBe('/dark.png');
    expect(tab.themeColor()).toBe('#000000');
    tab.setDark(false);
    expect(tab.href()).toBe('/light.png');
    expect(tab.themeColor()).toBe('#ffffff');
    tab.handle.destroy();
  });

  it('follows the page manual theme before the system preference', async () => {
    const tab = setup(true);
    tab.setManualScheme('light');
    await vi.waitFor(() => expect(tab.href()).toBe('/light.png'));
    expect(tab.themeColor()).toBe('#ffffff');

    tab.setManualScheme('dark');
    await vi.waitFor(() => expect(tab.href()).toBe('/dark.png'));
    expect(tab.themeColor()).toBe('#000000');

    tab.setManualScheme();
    await vi.waitFor(() => expect(tab.href()).toBe('/dark.png'));
    tab.handle.destroy();
  });

  it('removes its listener when destroyed', () => {
    const tab = setup(false);
    tab.handle.destroy();
    tab.setDark(true);
    expect(tab.href()).toBe('/light.png');
  });

  it('leaves pages without an icon untouched', () => {
    document.head.innerHTML = '';
    expect(() => initializeBrowserTab(document, window).destroy()).not.toThrow();
  });
});
