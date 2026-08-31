import type { CollectionEntry } from 'astro:content';
import { getCollection, getEntry } from 'astro:content';

import {
  pageSchema,
  siteSchema,
  type PageContent,
  type SiteContent,
} from '../content-schema';
import {
  SIMPLIFIED_CHINESE_LOCALE,
  type HtmlLanguage,
  type Locale,
} from './locales';
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
  bodyEntry:
    | CollectionEntry<'page'>
    | CollectionEntry<'pageEn'>
    | CollectionEntry<'pageZhHant'>;
  bodyLanguage?: HtmlLanguage;
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
  entry:
    | CollectionEntry<'page'>
    | CollectionEntry<'pageEn'>
    | CollectionEntry<'pageZhHant'>
    | undefined,
): entry is
  | CollectionEntry<'page'>
  | CollectionEntry<'pageEn'>
  | CollectionEntry<'pageZhHant'> {
  return typeof entry?.body === 'string' && entry.body.trim().length > 0;
}

export async function loadLocalizedWebsiteContent(locale: Locale): Promise<{
  site: LocalizedResult<SiteContent>;
  pages: LocalizedPage[];
  isComplete: boolean;
  missingTranslations: string[];
}> {
  const [
    siteEntry,
    siteEnEntry,
    siteZhHantEntry,
    pageEntries,
    pageEnEntries,
    pageZhHantEntries,
  ] = await Promise.all([
    getEntry('site', 'site'),
    getEntry('siteEn', 'site'),
    getEntry('siteZhHant', 'site'),
    getCollection('page'),
    getCollection('pageEn'),
    getCollection('pageZhHant'),
  ]);

  if (!siteEntry || !siteEnEntry || !siteZhHantEntry) {
    throw new Error('The localized site content entries are incomplete.');
  }

  const siteOverlay = locale === 'en' ? siteEnEntry.data : siteZhHantEntry.data;
  const site = locale === SIMPLIFIED_CHINESE_LOCALE
    ? completeBase(siteEntry.data)
    : localize(siteEntry.data, siteOverlay, (value) => siteSchema.parse(value));
  const englishPageById = new Map(pageEnEntries.map((entry) => [entry.id, entry]));
  const traditionalChinesePageById = new Map(
    pageZhHantEntries.map((entry) => [entry.id, entry]),
  );
  const pages = pageEntries.map((baseEntry): LocalizedPage => {
    const localizedEntry = locale === 'en'
      ? englishPageById.get(baseEntry.id)
      : traditionalChinesePageById.get(baseEntry.id);

    if (locale !== SIMPLIFIED_CHINESE_LOCALE && !localizedEntry) {
      throw new Error(`The ${locale} overlay for page "${baseEntry.id}" is missing.`);
    }

    const data = locale === SIMPLIFIED_CHINESE_LOCALE
      ? completeBase(baseEntry.data)
      : localize(baseEntry.data, localizedEntry?.data, (value) => pageSchema.parse(value));
    const useLocalizedBody = locale !== SIMPLIFIED_CHINESE_LOCALE
      && hasMarkdownBody(localizedEntry);
    const baseHasBody = hasMarkdownBody(baseEntry);
    const bodyUsesFallback = locale !== SIMPLIFIED_CHINESE_LOCALE
      && baseHasBody
      && !useLocalizedBody;

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
      bodyEntry: useLocalizedBody ? localizedEntry : baseEntry,
      bodyLanguage: bodyUsesFallback ? 'zh-CN' : undefined,
      bodyUsesFallback,
    };
  });
  const missingTranslations = locale !== SIMPLIFIED_CHINESE_LOCALE
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
    isComplete: missingTranslations.length === 0,
    missingTranslations,
  };
}
