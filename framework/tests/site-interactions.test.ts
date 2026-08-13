import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeSiteInteractions } from '../src/scripts/site-interactions';

describe('site navigation', () => {
  const originalIntersectionObserver = window.IntersectionObserver;
  const originalScrollTo = window.scrollTo;
  const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');
  let interactionHandle: ReturnType<typeof initializeSiteInteractions> | undefined;

  beforeEach(() => {
    interactionHandle = undefined;
    document.body.innerHTML = `
      <header data-site-header>
        <button
          type="button"
          aria-controls="compact-navigation"
          aria-expanded="false"
          data-menu-toggle
        >菜单</button>
        <a href="#page-top" data-home-link>Logo</a>
        <a href="#about-frc" data-section-link>关于 FRC</a>
        <nav id="compact-navigation" data-compact-menu hidden>
          <a href="#about-frc" data-section-link>关于 FRC</a>
        </nav>
      </header>
      <main>
        <div id="page-top" data-scroll-section></div>
        <section id="about-frc" data-scroll-section>关于 FRC</section>
      </main>
    `;
  });

  afterEach(() => {
    interactionHandle?.destroy();
    window.scrollTo = originalScrollTo;

    if (originalScrollYDescriptor) {
      Object.defineProperty(window, 'scrollY', originalScrollYDescriptor);
    } else {
      Reflect.deleteProperty(window, 'scrollY');
    }

    document.documentElement.style.removeProperty('--compact-navigation-active');

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: originalIntersectionObserver,
    });
  });

  it('scrolls a navigation target into view when its link is selected', () => {
    const target = document.querySelector<HTMLElement>('#about-frc');
    const scrollIntoView = vi.fn();
    target!.scrollIntoView = scrollIntoView;

    interactionHandle = initializeSiteInteractions(document, window);
    document.querySelector<HTMLAnchorElement>('[data-section-link]')!.click();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('keeps the header visible while navigating downward between sections', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const target = document.querySelector<HTMLElement>('#about-frc')!;
    target.scrollIntoView = vi.fn();
    let simulatedScrollY = 160;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 48 }));
    expect(header.dataset.hidden).toBe('true');

    document.querySelector<HTMLAnchorElement>('[data-section-link]')!.click();
    expect(header.dataset.hidden).toBeUndefined();

    simulatedScrollY = 640;
    window.dispatchEvent(new Event('scrollend'));

    expect(header.dataset.hidden).toBeUndefined();
    expect(header.inert).toBe(false);
  });

  it.each([
    ['a page key', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }))],
    ['pointer input', () => window.dispatchEvent(new PointerEvent('pointerdown'))],
  ])('restores downward header hiding when %s interrupts section navigation', (_, interrupt) => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const target = document.querySelector<HTMLElement>('#about-frc')!;
    target.scrollIntoView = vi.fn();
    let simulatedScrollY = 160;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    document.querySelector<HTMLAnchorElement>('[data-section-link]')!.click();
    interrupt();
    simulatedScrollY = 640;
    window.dispatchEvent(new Event('scrollend'));

    expect(header.dataset.hidden).toBe('true');
    expect(header.inert).toBe(true);
  });

  it('keeps the header visible when another section link is pressed during navigation', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const firstLink = document.querySelector<HTMLAnchorElement>('[data-section-link]')!;
    const secondLink = document.createElement('a');
    secondLink.href = '#about-team';
    secondLink.dataset.sectionLink = '';
    header.append(secondLink);

    const secondTarget = document.createElement('section');
    secondTarget.id = 'about-team';
    secondTarget.dataset.scrollSection = '';
    document.querySelector('main')!.append(secondTarget);

    document.querySelector<HTMLElement>('#about-frc')!.scrollIntoView = vi.fn();
    secondTarget.scrollIntoView = vi.fn();
    let simulatedScrollY = 160;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    firstLink.click();
    secondLink.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    simulatedScrollY = 640;
    window.dispatchEvent(new Event('scrollend'));

    expect(header.dataset.hidden).toBeUndefined();
    expect(header.inert).toBe(false);
  });

  it('returns to the page top when the logo is selected', () => {
    const scrollTo = vi.fn();
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    window.scrollTo = scrollTo;

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    document.querySelector<HTMLAnchorElement>('[data-home-link]')!.click();

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 0,
    });
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
  });

  it('hides the header while scrolling down and restores it while scrolling up', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 160 });

    interactionHandle = initializeSiteInteractions(document, window);
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 48 }));

    expect(header.dataset.hidden).toBe('true');
    expect(header.inert).toBe(true);

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -48 }));

    expect(header.dataset.hidden).toBeUndefined();
    expect(header.inert).toBe(false);
  });

  it('uses the actual page position to handle scrolling from any desktop input', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    let observerCallback: IntersectionObserverCallback | undefined;
    let simulatedScrollY = 0;

    class TestIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly scrollMargin = '0px';
      readonly thresholds = [0];
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
    }

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: TestIntersectionObserver,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    expect(observerCallback).toBeTypeOf('function');

    simulatedScrollY = 320;
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(header.dataset.hidden).toBe('true');

    simulatedScrollY = 120;
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(header.dataset.hidden).toBeUndefined();
  });

  it('restores a hidden header for upward desktop page navigation keys', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 160 });

    interactionHandle = initializeSiteInteractions(document, window);
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 48 }));

    expect(header.dataset.hidden).toBe('true');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));

    expect(header.dataset.hidden).toBeUndefined();
  });

  it('opens and closes the compact navigation from its menu button', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();

    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
    expect(compactMenu.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('[data-site-header]')!.dataset.menuOpen).toBe(
      'true',
    );

    menuToggle.click();

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('[data-site-header]')!.dataset.menuOpen).toBeUndefined();
  });

  it('closes the compact navigation when one of its section links is selected', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    const target = document.querySelector<HTMLElement>('#about-frc')!;
    target.scrollIntoView = vi.fn();

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    compactMenu.querySelector<HTMLAnchorElement>('[data-section-link]')!.click();

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('closes the compact navigation when the page outside the header is pressed', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    document.querySelector('main')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
  });

  it('closes the compact navigation with Escape and returns focus to its button', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    compactMenu.querySelector<HTMLAnchorElement>('[data-section-link]')!.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(document.activeElement).toBe(menuToggle);
  });

  it('closes the compact navigation before hiding the header on downward input', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 160 });

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 48 }));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(header.dataset.hidden).toBe('true');
  });

  it('closes the compact navigation during downward touch-style page scrolling', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    let simulatedScrollY = 0;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    simulatedScrollY = 180;
    window.dispatchEvent(new Event('scroll'));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(header.dataset.hidden).toBe('true');
  });

  it('closes the compact navigation on a small downward scroll before hiding the header', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    let simulatedScrollY = 0;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    simulatedScrollY = 24;
    window.dispatchEvent(new Event('scroll'));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(header.dataset.hidden).toBeUndefined();
  });

  it('accumulates small touch-style scroll changes before updating the header', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    let simulatedScrollY = 0;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => simulatedScrollY,
    });

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();

    simulatedScrollY = 2;
    window.dispatchEvent(new Event('scroll'));
    simulatedScrollY = 4;
    window.dispatchEvent(new Event('scroll'));
    simulatedScrollY = 6;
    window.dispatchEvent(new Event('scroll'));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
    expect(header.dataset.hidden).toBeUndefined();
  });

  it('keeps a tall compact menu open while the menu itself scrolls', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 160 });

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    compactMenu.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 48 }));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
    expect(compactMenu.hidden).toBe(false);
  });

  it('keeps a tall compact menu open for keyboard scrolling inside the menu', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;
    const menuLink = compactMenu.querySelector<HTMLAnchorElement>('[data-section-link]')!;

    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    menuLink.focus();
    menuLink.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'PageDown' }));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
    expect(compactMenu.hidden).toBe(false);
  });

  it('closes the compact navigation when CSS changes to the wide layout', () => {
    const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const compactMenu = document.querySelector<HTMLElement>('[data-compact-menu]')!;

    document.documentElement.style.setProperty('--compact-navigation-active', '1');
    interactionHandle = initializeSiteInteractions(document, window);
    menuToggle.click();
    window.dispatchEvent(new Event('resize'));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
    expect(compactMenu.hidden).toBe(false);

    document.documentElement.style.setProperty('--compact-navigation-active', '0');
    window.dispatchEvent(new Event('resize'));

    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(compactMenu.hidden).toBe(true);
  });
});
