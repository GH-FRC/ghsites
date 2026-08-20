import { resolveLegacySectionRoute } from '../site-structure';

interface LegacyLocation {
  hash: string;
  replace: (url: string) => void;
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
