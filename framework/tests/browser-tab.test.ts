import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeBrowserTab } from '../src/scripts/browser-tab';

afterEach(() => {
  document.head.innerHTML = '';
  vi.restoreAllMocks();
});

function setup(initiallyDark: boolean) {
  document.head.innerHTML = '<link rel="icon" href="/light.png" data-browser-tab-icon data-light-icon="/light.png" data-dark-icon="/dark.png">';
  let dark = initiallyDark;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  Object.defineProperty(preference, 'matches', { configurable: true, get: () => dark });
  vi.spyOn(window, 'matchMedia').mockReturnValue(preference);
  const handle = initializeBrowserTab(document, window);
  return {
    handle,
    href: () => document.querySelector('link')?.getAttribute('href'),
    setDark(value: boolean) {
      dark = value;
      preference.dispatchEvent(new Event('change'));
    },
  };
}

describe('browser tab appearance', () => {
  it('uses the black icon for a light browser preference', () => {
    const tab = setup(false);
    expect(tab.href()).toBe('/light.png');
    tab.handle.destroy();
  });

  it('uses the white icon for a dark browser preference', () => {
    const tab = setup(true);
    expect(tab.href()).toBe('/dark.png');
    tab.handle.destroy();
  });

  it('updates in both directions when the browser preference changes', () => {
    const tab = setup(false);
    tab.setDark(true);
    expect(tab.href()).toBe('/dark.png');
    tab.setDark(false);
    expect(tab.href()).toBe('/light.png');
    tab.handle.destroy();
  });

  it('removes its listener when destroyed', () => {
    const tab = setup(false);
    tab.handle.destroy();
    tab.setDark(true);
    expect(tab.href()).toBe('/light.png');
  });

  it('leaves pages without an icon untouched', () => {
    expect(() => initializeBrowserTab(document, window).destroy()).not.toThrow();
  });
});

