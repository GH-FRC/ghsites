import { defineConfig } from 'astro/config';

import {
  SIMPLIFIED_CHINESE_LOCALE,
  SUPPORTED_LOCALES,
} from './src/i18n/locales';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://ghfrc.org',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    locales: [...SUPPORTED_LOCALES],
    defaultLocale: SIMPLIFIED_CHINESE_LOCALE,
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
