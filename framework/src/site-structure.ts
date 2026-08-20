export const sitePagePlan = [
  { id: 'about-frc', contentId: 'frc', href: '/frc/', order: 1 },
  { id: 'about-xplore', contentId: 'xplore', href: '/xplore/', order: 2 },
  { id: 'about-gh-frc', contentId: 'team', href: '/team/', order: 3 },
  { id: 'robots', contentId: 'robots', href: '/robots/', order: 4 },
  { id: 'achievements', contentId: 'achievements', href: '/achievements/', order: 5 },
  { id: 'news', contentId: 'news', href: '/news/', order: 6 },
  { id: 'sponsors', contentId: 'sponsors', href: '/sponsors/', order: 7 },
  { id: 'contact', contentId: 'contact', href: '/contact/', order: 8 },
] as const;

export type SitePageId = (typeof sitePagePlan)[number]['id'];
export type SiteContentId = (typeof sitePagePlan)[number]['contentId'];
export type SiteNavigationContext = 'home' | SitePageId;

export function buildSiteNavigationItems(
  labels: Record<SitePageId, string>,
  context: SiteNavigationContext,
) {
  return sitePagePlan.map(({ href, id }) => ({
    href,
    label: labels[id],
    isCurrent: context === id,
  }));
}

export function resolveLegacySectionRoute(hash: string): string | undefined {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;

  return sitePagePlan.find(({ id }) => id === normalizedHash)?.href;
}
