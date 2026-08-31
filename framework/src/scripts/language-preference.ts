import {
  browserLanguageToLocale,
  DEFAULT_BROWSER_LOCALE,
  isLocale,
  SUPPORTED_LOCALES,
  TRADITIONAL_CHINESE_LOCALE,
  TRADITIONAL_CHINESE_REGIONS,
  type Locale,
} from '../i18n/locales';

export const LANGUAGE_STORAGE_KEY = 'ghfrc-language';
export const AUTOMATIC_LANGUAGE_QUERY_KEY = '__ghfrc_auto_language';

export interface LocalePreferenceOptions {
  browserLanguages?: readonly unknown[];
  explicitLocale?: Locale;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
}

export function buildLanguageSwitchPath(
  targetLocale: Locale,
  currentPathname: string,
  currentHash = '',
): string {
  const localePathPattern = new RegExp(
    `^/(?:${SUPPORTED_LOCALES.join('|')})(?=/|$)`,
  );
  const pathWithoutLocale = currentPathname.replace(localePathPattern, '');
  const pathname =
    pathWithoutLocale === ''
      ? '/'
      : pathWithoutLocale.startsWith('/')
        ? pathWithoutLocale
        : `/${pathWithoutLocale}`;

  return `/${targetLocale}${pathname}${currentHash}`;
}

export function initializeLanguageSwitchLinks(
  documentRef: Pick<Document, 'querySelectorAll'> = document,
  windowRef: Pick<Window, 'localStorage' | 'location'> = window,
): void {
  const languageLinks = documentRef.querySelectorAll<HTMLAnchorElement>(
    '[data-language-switch]',
  );

  languageLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const targetLocale = link.dataset.languageLocale;

      if (isLocale(targetLocale)) {
        try {
          windowRef.localStorage.setItem(LANGUAGE_STORAGE_KEY, targetLocale);
        } catch {
          // The target URL remains authoritative when storage is unavailable.
        }
      }

      const target = new URL(link.href);
      target.search = windowRef.location.search;
      target.hash = windowRef.location.hash;
      link.href = target.toString();
    });
  });
}

export function createLanguageRedirectScript(
  storageKey = LANGUAGE_STORAGE_KEY,
): string {
  const serializedStorageKey = JSON.stringify(storageKey);
  const serializedAutomaticLanguageQueryKey = JSON.stringify(
    AUTOMATIC_LANGUAGE_QUERY_KEY,
  );
  const serializedDefaultLocale = JSON.stringify(DEFAULT_BROWSER_LOCALE);
  const serializedSupportedLocales = JSON.stringify(SUPPORTED_LOCALES);
  const serializedTraditionalChineseLocale = JSON.stringify(
    TRADITIONAL_CHINESE_LOCALE,
  );
  const serializedTraditionalChineseRegions = JSON.stringify(
    TRADITIONAL_CHINESE_REGIONS,
  );

  return `(function () {
    var locale = ${serializedDefaultLocale};
    var hasStoredLocale = false;
    var storedLocale;
    var supportedLocales = ${serializedSupportedLocales};

    try {
      storedLocale = window.localStorage.getItem(${serializedStorageKey});
    } catch (error) {
      // Storage can be blocked without preventing the redirect.
    }

    if (supportedLocales.indexOf(storedLocale) >= 0) {
      locale = storedLocale;
      hasStoredLocale = true;
    }

    if (!hasStoredLocale) {
      var browserLanguage =
        window.navigator.languages && window.navigator.languages.length > 0
          ? window.navigator.languages[0]
          : window.navigator.language;

      try {
        var browserLocale =
          typeof browserLanguage === 'string'
            ? new Intl.Locale(browserLanguage)
            : null;

        if (browserLocale && browserLocale.language.toLowerCase() === 'zh') {
          var script = browserLocale.script
            ? browserLocale.script.toLowerCase()
            : '';
          var region = browserLocale.region
            ? browserLocale.region.toUpperCase()
            : '';
          var traditionalRegions = ${serializedTraditionalChineseRegions};

          locale =
            script === 'hant' ||
            (script !== 'hans' && traditionalRegions.indexOf(region) >= 0)
              ? ${serializedTraditionalChineseLocale}
              : 'zh-cn';
        } else {
          locale = ${serializedDefaultLocale};
        }
      } catch (error) {
        locale = ${serializedDefaultLocale};
      }
    }

    var pathname = window.location.pathname || '/';

    if (pathname.charAt(0) !== '/') {
      pathname = '/' + pathname;
    }

    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set(${serializedAutomaticLanguageQueryKey}, locale);
    var localizedSearch = searchParams.toString();

    window.location.replace(
      '/' + locale + pathname +
      (localizedSearch ? '?' + localizedSearch : '') +
      window.location.hash
    );
  })();`;
}

export function createLocaleVisitScript(
  locale: Locale,
  storageKey = LANGUAGE_STORAGE_KEY,
): string {
  const serializedAutomaticLanguageQueryKey = JSON.stringify(
    AUTOMATIC_LANGUAGE_QUERY_KEY,
  );
  const serializedLocale = JSON.stringify(locale);
  const serializedStorageKey = JSON.stringify(storageKey);

  return `(function () {
    var searchParams = new URLSearchParams(window.location.search);
    var automaticLocale = searchParams.get(${serializedAutomaticLanguageQueryKey});

    if (searchParams.has(${serializedAutomaticLanguageQueryKey})) {
      searchParams.delete(${serializedAutomaticLanguageQueryKey});
      var cleanedSearch = searchParams.toString();

      try {
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname +
            (cleanedSearch ? '?' + cleanedSearch : '') +
            window.location.hash
        );
      } catch (error) {
        // URL cleanup is optional and must not prevent language selection.
      }
    }

    if (automaticLocale === ${serializedLocale}) {
      return;
    }

    try {
      if (
        window.document.referrer &&
        new URL(window.document.referrer).origin === window.location.origin
      ) {
        return;
      }
    } catch (error) {
      // Invalid or unavailable referrer information is treated as an explicit visit.
    }

    try {
      window.localStorage.setItem(${serializedStorageKey}, ${serializedLocale});
    } catch (error) {
      // An explicit language URL remains authoritative when storage is unavailable.
    }
  })();`;
}

export function resolveLocalePreference({
  browserLanguages = [],
  explicitLocale,
  storage,
}: LocalePreferenceOptions): Locale {
  if (explicitLocale) {
    try {
      storage?.setItem(LANGUAGE_STORAGE_KEY, explicitLocale);
    } catch {
      // The URL remains authoritative when a browser blocks storage.
    }

    return explicitLocale;
  }

  let storedLocale: string | null | undefined;

  try {
    storedLocale = storage?.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return browserLanguageToLocale(browserLanguages[0]);
  }

  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return browserLanguageToLocale(browserLanguages[0]);
}
