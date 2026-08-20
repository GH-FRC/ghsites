import { getEntry } from 'astro:content';

import {
  aboutFrcSchema,
  siteSchema,
  type AboutFrcContent,
  type SiteContent,
} from '../content-schema';
import type { Locale } from './locales';
import { resolveLocalizedContent } from './localized-content';

interface LocalizedResult<T> {
  content: T;
  missingTranslations: readonly string[];
  fallbackPaths: ReadonlySet<string>;
  isComplete: boolean;
}

function completeBase<T>(content: T): LocalizedResult<T> {
  return {
    content,
    missingTranslations: [],
    fallbackPaths: new Set(),
    isComplete: true,
  };
}

function withValidatedContent<T>(
  result: LocalizedResult<T>,
  parse: (value: unknown) => T,
): LocalizedResult<T> {
  return {
    ...result,
    content: parse(result.content),
  };
}

export async function loadLocalizedWebsiteContent(locale: Locale): Promise<{
  site: LocalizedResult<SiteContent>;
  aboutFrc: LocalizedResult<AboutFrcContent>;
  isEnglishComplete: boolean;
  missingEnglishTranslations: string[];
}> {
  const [siteEntry, siteEnEntry, aboutFrcEntry, aboutFrcEnEntry] = await Promise.all([
    getEntry('site', 'site'),
    getEntry('siteEn', 'site'),
    getEntry('aboutFrc', 'aboutFrc'),
    getEntry('aboutFrcEn', 'aboutFrc'),
  ]);

  if (!siteEntry || !siteEnEntry || !aboutFrcEntry || !aboutFrcEnEntry) {
    throw new Error('The localized website content entries are incomplete.');
  }

  if (locale === 'zh-cn') {
    return {
      site: completeBase(siteEntry.data),
      aboutFrc: completeBase(aboutFrcEntry.data),
      isEnglishComplete: false,
      missingEnglishTranslations: [],
    };
  }

  const site = withValidatedContent(
    resolveLocalizedContent(siteEntry.data, siteEnEntry.data),
    (value) => siteSchema.parse(value),
  );
  const aboutFrc = withValidatedContent(
    resolveLocalizedContent(aboutFrcEntry.data, aboutFrcEnEntry.data),
    (value) => aboutFrcSchema.parse(value),
  );
  const missingEnglishTranslations = [
    ...site.missingTranslations.map((path) => `site.${path}`),
    ...aboutFrc.missingTranslations.map((path) => `aboutFrc.${path}`),
  ];

  return {
    site,
    aboutFrc,
    isEnglishComplete: missingEnglishTranslations.length === 0,
    missingEnglishTranslations,
  };
}
