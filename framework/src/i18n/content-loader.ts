import type { CollectionEntry } from 'astro:content';
import { getCollection, getEntry } from 'astro:content';

import {
  pageSchema,
  siteSchema,
  type PageContent,
  type SiteContent,
} from '../content-schema';
import type { Locale } from './locales';
import {
  resolveLocalizedContent,
  type LocalizedContentOverlay,
} from './localized-content';

export interface LocalizedResult<T> {
  content: T;
  missingTranslations: readonly string[];
  fallbackPaths: ReadonlySet<string>;
  isComplete: boolean;
}

export interface LocalizedPage {
  id: string;
  data: LocalizedResult<PageContent>;
  bodyEntry: CollectionEntry<'page'> | CollectionEntry<'pageEn'>;
  bodyLanguage?: 'zh-CN';
  bodyUsesFallback: boolean;
}

function completeBase<T>(content: T): LocalizedResult<T> {
  return {
    content,
    missingTranslations: [],
    fallbackPaths: new Set(),
    isComplete: true,
  };
}

function localize<T>(
  base: T,
  overlay: unknown,
  parse: (value: unknown) => T,
): LocalizedResult<T> {
  const result = resolveLocalizedContent(
    base,
    overlay as LocalizedContentOverlay<T> | undefined,
  );
  return {
    ...result,
    content: parse(result.content),
  };
}

function hasMarkdownBody(
  entry: CollectionEntry<'page'> | CollectionEntry<'pageEn'> | undefined,
): entry is CollectionEntry<'page'> | CollectionEntry<'pageEn'> {
  return typeof entry?.body === 'string' && entry.body.trim().length > 0;
}

export async function loadLocalizedWebsiteContent(locale: Locale): Promise<{
  site: LocalizedResult<SiteContent>;
  pages: LocalizedPage[];
  isEnglishComplete: boolean;
  missingEnglishTranslations: string[];
}> {
  const [siteEntry, siteEnEntry, pageEntries, pageEnEntries] = await Promise.all([
    getEntry('site', 'site'),
    getEntry('siteEn', 'site'),
    getCollection('page'),
    getCollection('pageEn'),
  ]);

  if (!siteEntry || !siteEnEntry) {
    throw new Error('The localized site content entries are incomplete.');
  }

  const site = locale === 'zh-cn'
    ? completeBase(siteEntry.data)
    : localize(siteEntry.data, siteEnEntry.data, (value) => siteSchema.parse(value));
  const englishPageById = new Map(pageEnEntries.map((entry) => [entry.id, entry]));
  const pages = pageEntries.map((baseEntry): LocalizedPage => {
    const englishEntry = englishPageById.get(baseEntry.id);

    if (!englishEntry) {
      throw new Error(`The English overlay for page "${baseEntry.id}" is missing.`);
    }

    const data = locale === 'zh-cn'
      ? completeBase(baseEntry.data)
      : localize(baseEntry.data, englishEntry.data, (value) => pageSchema.parse(value));
    const useEnglishBody = locale === 'en' && hasMarkdownBody(englishEntry);
    const baseHasBody = hasMarkdownBody(baseEntry);
    const bodyUsesFallback = locale === 'en' && baseHasBody && !useEnglishBody;

    return {
      id: baseEntry.id,
      data: bodyUsesFallback
        ? {
            ...data,
            missingTranslations: [...data.missingTranslations, 'body'],
            fallbackPaths: new Set([...data.fallbackPaths, 'body']),
            isComplete: false,
          }
        : data,
      bodyEntry: useEnglishBody ? englishEntry : baseEntry,
      bodyLanguage: bodyUsesFallback ? 'zh-CN' : undefined,
      bodyUsesFallback,
    };
  });
  const missingEnglishTranslations = locale === 'en'
    ? [
        ...site.missingTranslations.map((path) => `site.${path}`),
        ...pages.flatMap((page) => (
          page.data.missingTranslations.map((path) => `pages.${page.id}.${path}`)
        )),
      ]
    : [];

  return {
    site,
    pages,
    isEnglishComplete: locale === 'en' && missingEnglishTranslations.length === 0,
    missingEnglishTranslations,
  };
}
