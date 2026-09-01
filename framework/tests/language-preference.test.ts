import { describe, expect, it } from 'vitest';

import { browserLanguageToLocale } from '../src/i18n/locales';
import {
  AUTOMATIC_LANGUAGE_QUERY_KEY,
  buildLanguageSwitchPath,
  createLocaleVisitScript,
  createLanguageRedirectScript,
  initializeLanguageSwitchLinks,
  LANGUAGE_STORAGE_KEY,
  resolveLocalePreference,
} from '../src/scripts/language-preference';

function createLanguageStorage(initialLocale?: string) {
  const values = new Map<string, string>();

  if (initialLocale !== undefined) {
    values.set(LANGUAGE_STORAGE_KEY, initialLocale);
  }

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

function runLanguageRedirect({
  browserLanguages = ['en-US'],
  hash = '',
  pathname = '/',
  search = '',
  storage = createLanguageStorage(),
}: {
  browserLanguages?: string[];
  hash?: string;
  pathname?: string;
  search?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}) {
  let replacement: string | undefined;
  const windowRef = {
    localStorage: storage,
    location: {
      hash,
      pathname,
      replace: (target: string) => {
        replacement = target;
      },
      search,
    },
    navigator: {
      languages: browserLanguages,
    },
  };
  const executeRedirect = new Function('window', createLanguageRedirectScript());

  executeRedirect(windowRef);

  return replacement;
}

function runLocaleVisit({
  hash = '',
  locale = 'en',
  pathname = '/en/',
  referrer = '',
  search = '',
  storage = createLanguageStorage(),
}: {
  hash?: string;
  locale?: 'zh-cn' | 'en';
  pathname?: string;
  referrer?: string;
  search?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}) {
  let cleanedUrl: string | undefined;
  const windowRef = {
    document: { referrer },
    history: {
      replaceState: (_state: unknown, _unused: string, url: string) => {
        cleanedUrl = url;
      },
      state: null,
    },
    localStorage: storage,
    location: { hash, origin: 'http://localhost:3000', pathname, search },
  };
  const executeVisit = new Function('window', createLocaleVisitScript(locale));

  executeVisit(windowRef);

  return { cleanedUrl, storage };
}

describe('browser locale selection', () => {
  it.each(['zh', 'zh-CN', 'zh-Hant-HK', 'ZH-tw'])(
    'uses Simplified Chinese for the browser language %s',
    (languageTag) => {
      expect(browserLanguageToLocale(languageTag)).toBe('zh-cn');
    },
  );

  it.each(['en', 'en-US'])(
    'uses English for the browser language %s',
    (languageTag) => {
      expect(browserLanguageToLocale(languageTag)).toBe('en');
    },
  );

  it.each(['ja', 'fr-FR', '', 'not_a_locale', undefined, null])(
    'uses Simplified Chinese as the default for the browser language %s',
    (languageTag) => {
      expect(browserLanguageToLocale(languageTag)).toBe('zh-cn');
    },
  );
});

describe('remembered locale selection', () => {
  it('prefers a valid saved locale over the browser language', () => {
    const storage = createLanguageStorage('zh-cn');

    expect(
      resolveLocalePreference({
        browserLanguages: ['en-US'],
        storage,
      }),
    ).toBe('zh-cn');
  });

  it.each(['unsupported-locale', 'toString'])(
    'uses the primary browser language when the saved locale %s is invalid',
    (savedLocale) => {
      expect(
        resolveLocalePreference({
          browserLanguages: ['zh-Hant-HK', 'en-US'],
          storage: createLanguageStorage(savedLocale),
        }),
      ).toBe('zh-cn');
    },
  );

  it('uses and remembers the locale forced by an explicit language URL', () => {
    const storage = createLanguageStorage('zh-cn');

    expect(
      resolveLocalePreference({
        browserLanguages: ['zh-CN'],
        explicitLocale: 'en',
        storage,
      }),
    ).toBe('en');
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('uses the browser language when saved preferences cannot be read', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new DOMException('Storage unavailable');
      },
      setItem: () => undefined,
    };

    expect(
      resolveLocalePreference({
        browserLanguages: ['zh-CN'],
        storage: unavailableStorage,
      }),
    ).toBe('zh-cn');
  });

  it('keeps an explicit URL authoritative when its preference cannot be saved', () => {
    const unavailableStorage = {
      getItem: () => 'zh-cn',
      setItem: () => {
        throw new DOMException('Storage unavailable');
      },
    };

    expect(
      resolveLocalePreference({
        browserLanguages: ['zh-CN'],
        explicitLocale: 'en',
        storage: unavailableStorage,
      }),
    ).toBe('en');
  });
});

describe('unlocalized route redirects', () => {
  it('replaces the root URL while preserving its query and hash', () => {
    expect(
      runLanguageRedirect({
        browserLanguages: ['zh-CN'],
        hash: '#robots',
        search: '?review=1',
        storage: createLanguageStorage('en'),
      }),
    ).toBe(`/en/?review=1&${AUTOMATIC_LANGUAGE_QUERY_KEY}=en#robots`);
  });

  it('uses the browser locale for a legacy route and preserves its English slug', () => {
    expect(
      runLanguageRedirect({
        browserLanguages: ['zh-Hant-HK', 'en-US'],
        hash: '#history',
        pathname: '/about-frc/',
        search: '?review=1',
      }),
    ).toBe(
      `/zh-cn/about-frc/?review=1&${AUTOMATIC_LANGUAGE_QUERY_KEY}=zh-cn#history`,
    );
  });

  it('still redirects from the browser language when local storage is blocked', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new DOMException('Storage unavailable');
      },
      setItem: () => undefined,
    };

    expect(
      runLanguageRedirect({
        browserLanguages: ['zh-CN'],
        storage: unavailableStorage,
      }),
    ).toBe(`/zh-cn/?${AUTOMATIC_LANGUAGE_QUERY_KEY}=zh-cn`);
  });

  it('redirects to Simplified Chinese when the browser language tag is invalid', () => {
    expect(
      runLanguageRedirect({
        browserLanguages: ['not_a_locale'],
      }),
    ).toBe(`/zh-cn/?${AUTOMATIC_LANGUAGE_QUERY_KEY}=zh-cn`);
  });
});

describe('explicit and automatic locale visits', () => {
  it('does not persist a browser-detected automatic locale and removes the internal marker', () => {
    const result = runLocaleVisit({
      hash: '#robots',
      search: `?review=1&${AUTOMATIC_LANGUAGE_QUERY_KEY}=en`,
    });

    expect(result.storage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    expect(result.cleanedUrl).toBe('/en/?review=1#robots');
  });

  it('persists a locale selected through an explicit language URL', () => {
    const result = runLocaleVisit({ locale: 'zh-cn', pathname: '/zh-cn/' });

    expect(result.storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-cn');
    expect(result.cleanedUrl).toBeUndefined();
  });

  it('does not turn ordinary same-origin navigation into a manual language choice', () => {
    const result = runLocaleVisit({
      pathname: '/en/about-frc/',
      referrer: 'http://localhost:3000/en/',
    });

    expect(result.storage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });
});

describe('language switch URLs', () => {
  it('keeps the current English slug and hash when the locale changes', () => {
    expect(buildLanguageSwitchPath('en', '/zh-cn/about-frc/', '#history')).toBe(
      '/en/about-frc/#history',
    );
  });

  it('preserves the live query string and page fragment when a language link is activated', () => {
    window.history.replaceState(null, '', '/en/about-frc/?review=1#history');
    window.localStorage.clear();
    document.body.innerHTML = `
      <a href="/zh-cn/about-frc/" data-language-switch data-language-locale="zh-cn">中</a>
    `;
    const link = document.querySelector<HTMLAnchorElement>('[data-language-switch]');

    expect(link).not.toBeNull();
    link?.addEventListener('click', (event) => event.preventDefault(), { capture: true });
    initializeLanguageSwitchLinks(document, window);
    link?.click();

    expect(link?.href).toBe('http://localhost:3000/zh-cn/about-frc/?review=1#history');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-cn');
  });
});
