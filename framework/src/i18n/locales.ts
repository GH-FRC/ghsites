export const SIMPLIFIED_CHINESE_LOCALE = 'zh-cn' as const;
export const TRADITIONAL_CHINESE_LOCALE = 'zh-hant' as const;
export const ENGLISH_LOCALE = 'en' as const;

export const LOCALE_METADATA = {
  [SIMPLIFIED_CHINESE_LOCALE]: { htmlLanguage: 'zh-CN' },
  [TRADITIONAL_CHINESE_LOCALE]: { htmlLanguage: 'zh-Hant' },
  [ENGLISH_LOCALE]: { htmlLanguage: 'en' },
} as const;

export type Locale = keyof typeof LOCALE_METADATA;
export type HtmlLanguage = (typeof LOCALE_METADATA)[Locale]['htmlLanguage'];

export const SUPPORTED_LOCALES = Object.keys(LOCALE_METADATA) as Locale[];
export const DEFAULT_BROWSER_LOCALE: Locale = ENGLISH_LOCALE;
export const TRADITIONAL_CHINESE_REGIONS = ['HK', 'MO', 'TW'] as const;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALE_METADATA, value);
}

export function htmlLanguageForLocale(locale: Locale): HtmlLanguage {
  return LOCALE_METADATA[locale].htmlLanguage;
}

export function browserLanguageToLocale(languageTag: unknown): Locale {
  if (typeof languageTag !== 'string' || languageTag.length === 0) {
    return DEFAULT_BROWSER_LOCALE;
  }

  try {
    const browserLocale = new Intl.Locale(languageTag);

    if (browserLocale.language.toLowerCase() !== 'zh') {
      return DEFAULT_BROWSER_LOCALE;
    }

    const script = browserLocale.script?.toLowerCase();

    if (script === 'hant') {
      return TRADITIONAL_CHINESE_LOCALE;
    }

    if (script === 'hans') {
      return SIMPLIFIED_CHINESE_LOCALE;
    }

    return TRADITIONAL_CHINESE_REGIONS.includes(
      browserLocale.region?.toUpperCase() as (typeof TRADITIONAL_CHINESE_REGIONS)[number],
    )
      ? TRADITIONAL_CHINESE_LOCALE
      : SIMPLIFIED_CHINESE_LOCALE;
  } catch {
    return DEFAULT_BROWSER_LOCALE;
  }
}
