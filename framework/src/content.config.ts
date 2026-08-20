import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';

import { aboutFrcSchema, localeOverlaySchema, siteSchema } from './content-schema';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : resolve(projectRoot, 'content');
const zhCnContentRoot = resolve(contentRoot, 'config', 'locales', 'zh-CN');
const enContentRoot = resolve(contentRoot, 'config', 'locales', 'en');
const siteContentFile = resolve(zhCnContentRoot, 'site.yaml');
const siteEnContentFile = resolve(enContentRoot, 'site.yaml');
const aboutFrcContentFile = resolve(zhCnContentRoot, 'about-frc.yaml');
const aboutFrcEnContentFile = resolve(enContentRoot, 'about-frc.yaml');

const site = defineCollection({
  loader: file(siteContentFile),
  schema: siteSchema,
});

const siteEn = defineCollection({
  loader: file(siteEnContentFile),
  schema: localeOverlaySchema,
});

const aboutFrc = defineCollection({
  loader: file(aboutFrcContentFile),
  schema: aboutFrcSchema,
});

const aboutFrcEn = defineCollection({
  loader: file(aboutFrcEnContentFile),
  schema: localeOverlaySchema,
});

export const collections = { aboutFrc, aboutFrcEn, site, siteEn };
