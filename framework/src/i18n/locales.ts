export const SIMPLIFIED_CHINESE_LOCALE = 'zh-cn' as const;
export const ENGLISH_LOCALE = 'en' as const;

export const LOCALE_METADATA = {
  [SIMPLIFIED_CHINESE_LOCALE]: { htmlLanguage: 'zh-CN' },
  [ENGLISH_LOCALE]: { htmlLanguage: 'en' },
} as const;

export type Locale = keyof typeof LOCALE_METADATA;
export type HtmlLanguage = (typeof LOCALE_METADATA)[Locale]['htmlLanguage'];

export const SUPPORTED_LOCALES = Object.keys(LOCALE_METADATA) as Locale[];
export const DEFAULT_BROWSER_LOCALE: Locale = ENGLISH_LOCALE;
export const BROWSER_LANGUAGE_LOCALES: Readonly<Record<string, Locale>> = {
  zh: SIMPLIFIED_CHINESE_LOCALE,
};
const LANGUAGE_SWITCH_TARGETS: Record<Locale, Locale> = {
  [SIMPLIFIED_CHINESE_LOCALE]: ENGLISH_LOCALE,
  [ENGLISH_LOCALE]: SIMPLIFIED_CHINESE_LOCALE,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALE_METADATA, value);
}

export function htmlLanguageForLocale(locale: Locale): HtmlLanguage {
  return LOCALE_METADATA[locale].htmlLanguage;
}

export function languageSwitchTargetFor(locale: Locale): Locale {
  return LANGUAGE_SWITCH_TARGETS[locale];
}

export function browserLanguageToLocale(languageTag: unknown): Locale {
  if (typeof languageTag !== 'string' || languageTag.length === 0) {
    return DEFAULT_BROWSER_LOCALE;
  }

  try {
    const languageCode = new Intl.Locale(languageTag).language.toLowerCase();
    return BROWSER_LANGUAGE_LOCALES[languageCode] ?? DEFAULT_BROWSER_LOCALE;
  } catch {
    return DEFAULT_BROWSER_LOCALE;
  }
}
