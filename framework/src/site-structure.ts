import type { Locale } from './i18n/locales';

export const sitePagePlan = [
  { id: 'about-frc', contentId: 'frc', order: 1 },
  { id: 'about-xplore', contentId: 'xplore', order: 2 },
  { id: 'about-gh-frc', contentId: 'team', order: 3 },
  { id: 'robots', contentId: 'robots', order: 4 },
  { id: 'achievements', contentId: 'achievements', order: 5 },
  { id: 'news', contentId: 'news', order: 6 },
  { id: 'sponsors', contentId: 'sponsors', order: 7 },
  { id: 'contact', contentId: 'contact', order: 8 },
] as const;

export type SitePageId = (typeof sitePagePlan)[number]['id'];
export type SiteContentId = (typeof sitePagePlan)[number]['contentId'];
export type SiteNavigationContext = 'home' | SitePageId;

export function buildSiteNavigationItems(
  labels: Record<SitePageId, string>,
  context: SiteNavigationContext,
  locale: Locale,
) {
  return sitePagePlan.map(({ contentId, id }) => ({
    href: localizedPageHref(locale, contentId),
    label: labels[id],
    isCurrent: context === id,
  }));
}

export function localizedPageHref(locale: Locale, contentId: SiteContentId) {
  return `/${locale}/${contentId}/`;
}

export function resolveLegacySectionRoute(
  hash: string,
  locale?: Locale,
): string | undefined {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const plan = sitePagePlan.find(({ id }) => id === normalizedHash);

  if (!plan) {
    return undefined;
  }

  return locale
    ? localizedPageHref(locale, plan.contentId)
    : `/${plan.contentId}/`;
}
