import type { Locale } from './i18n/locales';

export const sitePagePlan = [
  { id: 'about-frc', contentId: 'frc', order: 1, showOnHome: true },
  { id: 'about-gh-frc', contentId: 'team', order: 2, showOnHome: true },
  { id: 'events', contentId: 'events', order: 0, showOnHome: false },
  { id: 'robots', contentId: 'robots', order: 3, showOnHome: true },
  { id: 'achievements', contentId: 'achievements', order: 4, showOnHome: true },
  { id: 'news', contentId: 'news', order: 5, showOnHome: true },
  { id: 'sponsors', contentId: 'sponsors', order: 6, showOnHome: true },
  { id: 'contact', contentId: 'contact', order: 7, showOnHome: true },
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
