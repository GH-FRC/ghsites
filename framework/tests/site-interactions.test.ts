import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeSiteInteractions } from '../src/scripts/site-interactions';

describe('site navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header data-site-header>
        <a href="#page-top" data-home-link>Logo</a>
        <a href="#about-frc" data-section-link>关于 FRC</a>
      </header>
      <main>
        <div id="page-top"></div>
        <section id="about-frc">关于 FRC</section>
      </main>
    `;
  });

  it('scrolls a navigation target into view when its link is selected', () => {
    const target = document.querySelector<HTMLElement>('#about-frc');
    const scrollIntoView = vi.fn();
    target!.scrollIntoView = scrollIntoView;

    initializeSiteInteractions(document, window);
    document.querySelector<HTMLAnchorElement>('[data-section-link]')!.click();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('returns to the page top when the logo is selected', () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    initializeSiteInteractions(document, window);
    document.querySelector<HTMLAnchorElement>('[data-home-link]')!.click();

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 0,
    });
  });

  it('hides the header while scrolling down and restores it while scrolling up', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 160 });

    initializeSiteInteractions(document, window);
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 48 }));

    expect(header.dataset.hidden).toBe('true');

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -48 }));

    expect(header.dataset.hidden).toBeUndefined();
  });

  it('applies the same header behavior to desktop page navigation keys', () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')!;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 160 });

    initializeSiteInteractions(document, window);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));

    expect(header.dataset.hidden).toBe('true');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));

    expect(header.dataset.hidden).toBeUndefined();
  });
});
