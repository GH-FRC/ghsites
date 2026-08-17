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
  const menuToggle = documentRef.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const compactMenu = documentRef.querySelector<HTMLElement>('[data-compact-menu]');
  let isSectionNavigationInProgress = false;

  const showHeader = () => {
    if (!siteHeader) {
      return;
    }

    delete siteHeader.dataset.hidden;
    siteHeader.inert = false;
  };

  const closeCompactMenu = (returnFocus = false) => {
    if (!menuToggle || !compactMenu) {
      return;
    }

    const wasOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', 'false');
    compactMenu.hidden = true;

    if (siteHeader) {
      delete siteHeader.dataset.menuOpen;
    }

    if (compactMenu.contains(documentRef.activeElement)) {
      (documentRef.activeElement as HTMLElement).blur();
    }

    if (returnFocus && wasOpen) {
      menuToggle.focus();
    }
  };

  const openCompactMenu = () => {
    if (!menuToggle || !compactMenu) {
      return;
    }

    showHeader();
    menuToggle.setAttribute('aria-expanded', 'true');
    compactMenu.hidden = false;

    if (siteHeader) {
      siteHeader.dataset.menuOpen = 'true';
    }
  };

  if (menuToggle && compactMenu) {
    const handleMenuToggle = () => {
      if (menuToggle.getAttribute('aria-expanded') === 'true') {
        closeCompactMenu();
      } else {
        openCompactMenu();
      }
    };

    menuToggle.addEventListener('click', handleMenuToggle);
    cleanupCallbacks.push(() => menuToggle.removeEventListener('click', handleMenuToggle));
  }

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
      closeCompactMenu();
      showHeader();
      target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      windowRef.history.replaceState(null, '', href);
    };

    link.addEventListener('click', handleSectionClick);
    cleanupCallbacks.push(() => link.removeEventListener('click', handleSectionClick));
  });

  if (homeLink) {
    const handleHomeClick = (event: MouseEvent) => {
      const href = homeLink.getAttribute('href');

      if (!href?.startsWith('#')) {
        return;
      }

      event.preventDefault();
      closeCompactMenu();
      showHeader();
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

      if (scrollDistance > 4) {
        closeCompactMenu();
      }

      if (currentScrollPosition <= minimumScrollPosition) {
        showHeader();
      } else if (scrollDistance > 4) {
        hideHeader();
      } else if (scrollDistance < -4) {
        showHeader();
      }

      if (currentScrollPosition === 0 || Math.abs(scrollDistance) > 4) {
        return currentScrollPosition;
      }

      return previousScrollPosition;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.target instanceof Element && compactMenu?.contains(event.target)) {
        return;
      }

      isSectionNavigationInProgress = false;

      if (event.deltaY > 4) {
        closeCompactMenu();
        hideHeader();
      }

      if (event.deltaY < -4) {
        showHeader();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        isSectionNavigationInProgress = false;
        closeCompactMenu(true);
        return;
      }

      if (event.target instanceof Element && compactMenu?.contains(event.target)) {
        return;
      }

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
        closeCompactMenu();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuToggle?.getAttribute('aria-expanded') === 'true'
        && event.target instanceof Element
        && !siteHeader.contains(event.target)
      ) {
        closeCompactMenu();
      }

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

    const handleScroll = () => {
      lastObservedScrollPosition = updateHeaderFromActualPosition(lastObservedScrollPosition);
    };

    const handleResize = () => {
      const compactNavigationIsActive = windowRef
        .getComputedStyle(documentRef.documentElement)
        .getPropertyValue('--compact-navigation-active')
        .trim() === '1';

      if (!compactNavigationIsActive) {
        closeCompactMenu();
      }
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
    windowRef.addEventListener('scroll', handleScroll, { passive: true });
    windowRef.addEventListener('scrollend', handleScrollEnd);
    windowRef.addEventListener('resize', handleResize);
    documentRef.addEventListener('scrollend', handleScrollEnd);
    cleanupCallbacks.push(() => windowRef.removeEventListener('wheel', handleWheel));
    cleanupCallbacks.push(() => windowRef.removeEventListener('keydown', handleKeyDown));
    cleanupCallbacks.push(() => windowRef.removeEventListener('pointerdown', handlePointerDown));
    cleanupCallbacks.push(() => windowRef.removeEventListener('scroll', handleScroll));
    cleanupCallbacks.push(() => windowRef.removeEventListener('scrollend', handleScrollEnd));
    cleanupCallbacks.push(() => windowRef.removeEventListener('resize', handleResize));
    cleanupCallbacks.push(() => documentRef.removeEventListener('scrollend', handleScrollEnd));
  }

  return {
    destroy: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
  };
}
