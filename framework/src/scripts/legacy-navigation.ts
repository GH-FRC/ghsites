import { resolveLegacySectionRoute } from '../site-structure';

interface LegacyLocation {
  hash: string;
  replace: (url: string) => void;
}

interface LegacyNavigationEventTarget {
  addEventListener: (type: 'hashchange', listener: () => void) => void;
}

export function redirectLegacySection(
  locationRef: LegacyLocation = window.location,
): boolean {
  const route = resolveLegacySectionRoute(locationRef.hash);

  if (!route) {
    return false;
  }

  locationRef.replace(route);
  return true;
}

export function initializeLegacySectionNavigation(
  locationRef: LegacyLocation = window.location,
  eventTarget: LegacyNavigationEventTarget = window,
): boolean {
  const redirectedOnLoad = redirectLegacySection(locationRef);

  if (!redirectedOnLoad) {
    eventTarget.addEventListener('hashchange', () => {
      redirectLegacySection(locationRef);
    });
  }

  return redirectedOnLoad;
}
