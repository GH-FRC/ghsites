import { resolveLegacySectionRoute } from '../site-structure';
import { isLocale } from '../i18n/locales';

interface LegacyLocation {
  hash: string;
  pathname: string;
  replace: (url: string) => void;
}

interface LegacyNavigationEventTarget {
  addEventListener: (type: 'hashchange', listener: () => void) => void;
}

export function redirectLegacySection(
  locationRef: LegacyLocation = window.location,
): boolean {
  const localeSegment = locationRef.pathname.split('/').filter(Boolean)[0];
  const route = resolveLegacySectionRoute(
    locationRef.hash,
    isLocale(localeSegment) ? localeSegment : undefined,
  );

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
