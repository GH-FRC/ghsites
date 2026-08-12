export interface SiteInteractionHandle {
  destroy: () => void;
}

type BrowserWindow = Window & typeof globalThis;

export function initializeSiteInteractions(
  documentRef: Document = document,
  windowRef: BrowserWindow = window,
): SiteInteractionHandle {
  const cleanupCallbacks: Array<() => void> = [];
  const scrollBehavior: ScrollBehavior = windowRef.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches
    ? 'auto'
    : 'smooth';
  const sectionLinks = documentRef.querySelectorAll<HTMLAnchorElement>('[data-section-link]');
  const scrollSections = documentRef.querySelectorAll<HTMLElement>('[data-scroll-section]');
  const homeLink = documentRef.querySelector<HTMLAnchorElement>('[data-home-link]');
  const siteHeader = documentRef.querySelector<HTMLElement>('[data-site-header]');
  let isSectionNavigationInProgress = false;

  const showHeader = () => {
    if (!siteHeader) {
      return;
    }

    delete siteHeader.dataset.hidden;
    siteHeader.inert = false;
  };

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
      isSectionNavigationInProgress = true;
      showHeader();
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

      if (windowRef.location.hash) {
        windowRef.history.replaceState(
          null,
          '',
          `${windowRef.location.pathname}${windowRef.location.search}`,
        );
      }
    };

    homeLink.addEventListener('click', handleHomeClick);
    cleanupCallbacks.push(() => homeLink.removeEventListener('click', handleHomeClick));
  }

  if (siteHeader) {
    const minimumScrollPosition = Math.max(siteHeader.offsetHeight, 72);
    let lastSettledScrollPosition = windowRef.scrollY;
    let lastObservedScrollPosition = windowRef.scrollY;

    const hideHeader = () => {
      if (windowRef.scrollY > minimumScrollPosition) {
        const activeElement = documentRef.activeElement;

        if (activeElement instanceof HTMLElement && siteHeader.contains(activeElement)) {
          activeElement.blur();
        }

        siteHeader.dataset.hidden = 'true';
        siteHeader.inert = true;
      }
    };

    const updateHeaderFromActualPosition = (previousScrollPosition: number) => {
      const currentScrollPosition = windowRef.scrollY;

      if (isSectionNavigationInProgress) {
        showHeader();
        return currentScrollPosition;
      }

      const scrollDistance = currentScrollPosition - previousScrollPosition;

      if (currentScrollPosition <= minimumScrollPosition) {
        showHeader();
      } else if (scrollDistance > 4) {
        hideHeader();
      } else if (scrollDistance < -4) {
        showHeader();
      }

      return currentScrollPosition;
    };

    const handleWheel = (event: WheelEvent) => {
      isSectionNavigationInProgress = false;

      if (event.deltaY > 4) {
        hideHeader();
      }

      if (event.deltaY < -4) {
        showHeader();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const usesUpwardNavigationKey = ['ArrowUp', 'PageUp', 'Home'].includes(event.key);
      const usesReversePageKey = event.key === ' ' && event.shiftKey;
      const usesDownwardNavigationKey = ['ArrowDown', 'PageDown', 'End'].includes(event.key);
      const usesForwardPageKey = event.key === ' ' && !event.shiftKey;

      if (usesUpwardNavigationKey || usesReversePageKey) {
        isSectionNavigationInProgress = false;
        showHeader();
      }

      if (usesDownwardNavigationKey || usesForwardPageKey) {
        isSectionNavigationInProgress = false;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-section-link]')) {
        return;
      }

      isSectionNavigationInProgress = false;
    };

    const handleScrollEnd = () => {
      if (isSectionNavigationInProgress) {
        isSectionNavigationInProgress = false;
        showHeader();
        lastSettledScrollPosition = windowRef.scrollY;
        lastObservedScrollPosition = windowRef.scrollY;
        return;
      }

      lastSettledScrollPosition = updateHeaderFromActualPosition(lastSettledScrollPosition);
    };

    if (windowRef.IntersectionObserver && scrollSections.length > 0) {
      const sectionObserver = new windowRef.IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) {
            return;
          }

          lastObservedScrollPosition = updateHeaderFromActualPosition(lastObservedScrollPosition);
        },
        { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
      );

      scrollSections.forEach((section) => sectionObserver.observe(section));
      cleanupCallbacks.push(() => sectionObserver.disconnect());
    }

    windowRef.addEventListener('wheel', handleWheel, { passive: true });
    windowRef.addEventListener('keydown', handleKeyDown);
    windowRef.addEventListener('pointerdown', handlePointerDown, { passive: true });
    windowRef.addEventListener('scrollend', handleScrollEnd);
    documentRef.addEventListener('scrollend', handleScrollEnd);
    cleanupCallbacks.push(() => windowRef.removeEventListener('wheel', handleWheel));
    cleanupCallbacks.push(() => windowRef.removeEventListener('keydown', handleKeyDown));
    cleanupCallbacks.push(() => windowRef.removeEventListener('pointerdown', handlePointerDown));
    cleanupCallbacks.push(() => windowRef.removeEventListener('scrollend', handleScrollEnd));
    cleanupCallbacks.push(() => documentRef.removeEventListener('scrollend', handleScrollEnd));
  }

  return {
    destroy: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
  };
}
