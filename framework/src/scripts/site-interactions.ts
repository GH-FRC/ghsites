export interface SiteInteractionHandle {
  destroy: () => void;
}

export function initializeSiteInteractions(
  documentRef: Document = document,
  windowRef: Window = window,
): SiteInteractionHandle {
  const cleanupCallbacks: Array<() => void> = [];
  const scrollBehavior: ScrollBehavior = windowRef.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches
    ? 'auto'
    : 'smooth';
  const sectionLinks = documentRef.querySelectorAll<HTMLAnchorElement>('[data-section-link]');
  const homeLink = documentRef.querySelector<HTMLAnchorElement>('[data-home-link]');
  const siteHeader = documentRef.querySelector<HTMLElement>('[data-site-header]');

  sectionLinks.forEach((link) => {
    const handleSectionClick = (event: MouseEvent) => {
      const href = link.getAttribute('href');

      if (!href?.startsWith('#')) {
        return;
      }

      const target = documentRef.getElementById(decodeURIComponent(href.slice(1)));

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      windowRef.history.replaceState(null, '', href);
    };

    link.addEventListener('click', handleSectionClick);
    cleanupCallbacks.push(() => link.removeEventListener('click', handleSectionClick));
  });

  if (homeLink) {
    const handleHomeClick = (event: MouseEvent) => {
      event.preventDefault();
      windowRef.scrollTo({ behavior: scrollBehavior, top: 0 });
    };

    homeLink.addEventListener('click', handleHomeClick);
    cleanupCallbacks.push(() => homeLink.removeEventListener('click', handleHomeClick));
  }

  if (siteHeader) {
    const minimumScrollPosition = Math.max(siteHeader.offsetHeight, 72);

    const hideHeader = () => {
      if (windowRef.scrollY > minimumScrollPosition) {
        siteHeader.dataset.hidden = 'true';
      }
    };

    const showHeader = () => {
      delete siteHeader.dataset.hidden;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY > 4) {
        hideHeader();
      }

      if (event.deltaY < -4) {
        showHeader();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'End'].includes(event.key) || (event.key === ' ' && !event.shiftKey)) {
        hideHeader();
      }

      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) {
        showHeader();
      }
    };

    windowRef.addEventListener('wheel', handleWheel, { passive: true });
    windowRef.addEventListener('keydown', handleKeyDown);
    cleanupCallbacks.push(() => windowRef.removeEventListener('wheel', handleWheel));
    cleanupCallbacks.push(() => windowRef.removeEventListener('keydown', handleKeyDown));
  }

  return {
    destroy: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
  };
}
