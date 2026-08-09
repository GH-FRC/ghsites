import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : resolve(projectRoot, 'content');
const siteContentFile = resolve(contentRoot, 'config', 'site.yaml');

const sectionSchema = z.object({
  heading: z.string().min(1),
  bodyPlaceholder: z.string().min(1),
  mediaPlaceholder: z.string().min(1).optional(),
  itemPlaceholders: z.array(z.string().min(1)),
});

const site = defineCollection({
  loader: file(siteContentFile),
  schema: z.object({
    language: z.literal('zh-CN'),
    title: z.string().min(1),
    description: z.string().min(1),
    logo: z.object({
      src: z.string().min(1),
      alt: z.string().min(1),
      intrinsicWidth: z.number().int().positive(),
      intrinsicHeight: z.number().int().positive(),
    }),
    accessibility: z.object({
      mainNavigation: z.string().min(1),
      returnToTop: z.string().min(1),
    }),
    navigation: z.object({
      'about-frc': z.string().min(1),
      'about-xplore': z.string().min(1),
      'about-gh-frc': z.string().min(1),
      robots: z.string().min(1),
      achievements: z.string().min(1),
      news: z.string().min(1),
      sponsors: z.string().min(1),
      contact: z.string().min(1),
    }),
    hero: z.object({
      title: z.string().min(1),
      introPlaceholder: z.string().min(1),
      mediaPlaceholder: z.string().min(1),
    }),
    sections: z.object({
      'about-frc': sectionSchema,
      'about-xplore': sectionSchema,
      'about-gh-frc': sectionSchema,
      robots: sectionSchema,
      achievements: sectionSchema,
      news: sectionSchema,
      sponsors: sectionSchema,
      contact: sectionSchema,
    }),
    footer: z.object({
      title: z.string().min(1),
      placeholder: z.string().min(1),
    }),
  }),
});

export const collections = { site };
