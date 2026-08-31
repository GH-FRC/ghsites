import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';

import {
  localeOverlaySchema,
  newsSchema,
  pageSchema,
  robotSchema,
  siteSchema,
} from './content-schema';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : resolve(projectRoot, 'content');

function contentUrl(...segments: string[]) {
  return pathToFileURL(resolve(contentRoot, ...segments));
}

const site = defineCollection({
  loader: file(resolve(contentRoot, 'config', 'locales', 'zh-CN', 'site.yaml')),
  schema: siteSchema,
});

const siteEn = defineCollection({
  loader: file(resolve(contentRoot, 'config', 'locales', 'en', 'site.yaml')),
  schema: localeOverlaySchema,
});

const siteZhHant = defineCollection({
  loader: file(resolve(contentRoot, 'config', 'locales', 'zh-Hant', 'site.yaml')),
  schema: localeOverlaySchema,
});

const page = defineCollection({
  loader: glob({
    base: contentUrl('pages', 'zh-CN'),
    pattern: '*.md',
  }),
  schema: pageSchema,
});

const pageEn = defineCollection({
  loader: glob({
    base: contentUrl('pages', 'en'),
    pattern: '*.md',
  }),
  schema: localeOverlaySchema,
});

const pageZhHant = defineCollection({
  loader: glob({
    base: contentUrl('pages', 'zh-Hant'),
    pattern: '*.md',
  }),
  schema: localeOverlaySchema,
});

const robot = defineCollection({
  loader: glob({
    base: contentUrl('robots'),
    pattern: '*.md',
  }),
  schema: robotSchema,
});

const news = defineCollection({
  loader: glob({
    base: contentUrl('news'),
    pattern: '*.md',
  }),
  schema: newsSchema,
});

export const collections = {
  news,
  page,
  pageEn,
  pageZhHant,
  robot,
  site,
  siteEn,
  siteZhHant,
};
