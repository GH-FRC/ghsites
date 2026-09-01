import { describe, expect, it } from 'vitest';

import {
  buildSiteNavigationItems,
  FIRST_FRC_OFFICIAL_URL,
  localizedPageHref,
  resolveLegacySectionRoute,
  sitePagePlan,
} from '../src/site-structure';

const labels = {
  'about-frc': '关于 FRC',
  'about-gh-frc': '关于 GHFRC',
  events: '活动',
  robots: '机器人',
  sponsors: '赞助商',
  contact: '联系我们',
};

describe('site page structure', () => {
  it('publishes the six active Stable navigation destinations as independent routes', () => {
    expect(sitePagePlan.map(({ id, contentId }) => [id, contentId])).toEqual([
      ['about-frc', 'frc'],
      ['about-gh-frc', 'team'],
      ['events', 'events'],
      ['robots', 'robots'],
      ['sponsors', 'sponsors'],
      ['contact', 'contact'],
    ]);
  });

  it('opens only the About FRC navigation item on the official FIRST site', () => {
    const items = buildSiteNavigationItems(labels, 'robots', 'en');

    expect(items[0]).toEqual({
      href: FIRST_FRC_OFFICIAL_URL,
      label: '关于 FRC',
      isCurrent: false,
      opensInNewTab: true,
    });
    expect(items.filter(({ isCurrent }) => isCurrent)).toEqual([
      expect.objectContaining({
        href: '/en/robots/',
        label: '机器人',
        opensInNewTab: false,
      }),
    ]);
    expect(items.slice(1).every(({ href }) => href.startsWith('/'))).toBe(true);
  });

  it('builds localized page paths with stable English slugs', () => {
    expect(localizedPageHref('zh-cn', 'frc')).toBe('/zh-cn/frc/');
    expect(localizedPageHref('en', 'frc')).toBe('/en/frc/');
  });

  it('maps legacy homepage section hashes to their independent routes', () => {
    expect(resolveLegacySectionRoute('#about-frc')).toBe('/frc/');
    expect(resolveLegacySectionRoute('#about-gh-frc')).toBe('/team/');
    expect(resolveLegacySectionRoute('#events')).toBe('/events/');
    expect(resolveLegacySectionRoute('#robots')).toBe('/robots/');
    expect(resolveLegacySectionRoute('#sponsors')).toBe('/sponsors/');
    expect(resolveLegacySectionRoute('#contact')).toBe('/contact/');
    expect(resolveLegacySectionRoute('#achievements')).toBeUndefined();
    expect(resolveLegacySectionRoute('#news')).toBeUndefined();
    expect(resolveLegacySectionRoute('#unknown')).toBeUndefined();
  });
});
