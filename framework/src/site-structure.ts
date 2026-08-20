export const siteSectionPlan = [
  { id: 'about-frc', index: '02', variant: 'split' },
  { id: 'about-xplore', index: '03', variant: 'split-reverse' },
  { id: 'about-gh-frc', index: '04', variant: 'overview' },
  { id: 'robots', index: '05', variant: 'feature' },
  { id: 'achievements', index: '06', variant: 'grid' },
  { id: 'news', index: '07', variant: 'news' },
  { id: 'sponsors', index: '08', variant: 'sponsors' },
  { id: 'contact', index: '09', variant: 'contact' },
] as const;

type SiteSectionId = (typeof siteSectionPlan)[number]['id'];
type SiteNavigationContext = 'home' | 'about-frc';
export function buildSiteNavigationItems(
  labels: Record<SiteSectionId, string>,
  context: SiteNavigationContext,
  locale: Locale,
) {
  const localizedHomePath = `/${locale}/`;

  return siteSectionPlan.map(({ id }) => ({
    href:
      id === 'about-frc'
        ? `${localizedHomePath}about-frc/`
        : context === 'home'
          ? `#${id}`
          : `${localizedHomePath}#${id}`,
    label: labels[id],
    isCurrent: context === 'about-frc' && id === 'about-frc',
  }));
}
import type { Locale } from './i18n/locales';
