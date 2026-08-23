import { describe, expect, it } from 'vitest';

import {
  buildSiteNavigationItems,
  localizedPageHref,
  resolveLegacySectionRoute,
  sitePagePlan,
} from '../src/site-structure';

const labels = {
  'about-frc': '关于 FRC',
  'about-xplore': '关于 X.PLORE',
  'about-gh-frc': '关于 GHFRC',
  robots: '机器人',
  achievements: '赛事成果',
  news: '新闻动态',
  sponsors: '赞助商',
  contact: '联系我们',
};

describe('site page structure', () => {
  it('publishes all eight navigation destinations as independent routes', () => {
    expect(sitePagePlan.map(({ id, contentId }) => [id, contentId])).toEqual([
      ['about-frc', 'frc'],
      ['about-xplore', 'xplore'],
      ['about-gh-frc', 'team'],
      ['robots', 'robots'],
      ['achievements', 'achievements'],
      ['news', 'news'],
      ['sponsors', 'sponsors'],
      ['contact', 'contact'],
    ]);
  });

  it('marks only the current independent page in global navigation', () => {
    const items = buildSiteNavigationItems(labels, 'robots', 'en');

    expect(items.filter(({ isCurrent }) => isCurrent)).toEqual([
      expect.objectContaining({ href: '/en/robots/', label: '机器人' }),
    ]);
    expect(items.every(({ href }) => href.startsWith('/'))).toBe(true);
  });

  it('builds localized page paths with stable English slugs', () => {
    expect(localizedPageHref('zh-cn', 'frc')).toBe('/zh-cn/frc/');
    expect(localizedPageHref('en', 'frc')).toBe('/en/frc/');
  });

  it('maps legacy homepage section hashes to their independent routes', () => {
    expect(resolveLegacySectionRoute('#about-frc')).toBe('/frc/');
    expect(resolveLegacySectionRoute('#about-xplore')).toBe('/xplore/');
    expect(resolveLegacySectionRoute('#about-gh-frc')).toBe('/team/');
    expect(resolveLegacySectionRoute('#robots')).toBe('/robots/');
    expect(resolveLegacySectionRoute('#achievements')).toBe('/achievements/');
    expect(resolveLegacySectionRoute('#news')).toBe('/news/');
    expect(resolveLegacySectionRoute('#sponsors')).toBe('/sponsors/');
    expect(resolveLegacySectionRoute('#contact')).toBe('/contact/');
    expect(resolveLegacySectionRoute('#unknown')).toBeUndefined();
  });
});
