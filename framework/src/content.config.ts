import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : resolve(projectRoot, 'content');
const siteContentFile = resolve(contentRoot, 'config', 'site.yaml');
const pagesContentDirectory = pathToFileURL(resolve(contentRoot, 'pages'));
const robotsContentDirectory = pathToFileURL(resolve(contentRoot, 'robots'));
const newsContentDirectory = pathToFileURL(resolve(contentRoot, 'news'));

const mediaBaseShape = {
  src: z.string().startsWith('/content/'),
  alt: z.string().min(1),
  intrinsicWidth: z.number().int().positive(),
  intrinsicHeight: z.number().int().positive(),
};

const imageMediaSchema = z.object({
  ...mediaBaseShape,
  type: z.literal('image').default('image'),
});

const videoMediaSchema = z.object({
  ...mediaBaseShape,
  type: z.literal('video'),
  poster: z.string().startsWith('/content/').optional(),
  captions: z.array(z.object({
    src: z.string().startsWith('/content/'),
    srclang: z.string().min(2),
    label: z.string().min(1),
    default: z.boolean().optional(),
  })).optional(),
});

const mediaSchema = z.union([videoMediaSchema, imageMediaSchema]);

const emptyStateSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

const site = defineCollection({
  loader: file(siteContentFile),
  schema: z.object({
    language: z.literal('zh-CN'),
    title: z.string().min(1),
    description: z.string().min(1),
    logo: z.object({
      ...mediaBaseShape,
    }),
    accessibility: z.object({
      skipToContent: z.string().min(1),
      mainNavigation: z.string().min(1),
      breadcrumbNavigation: z.string().min(1),
      homeLabel: z.string().min(1),
      returnToTop: z.string().min(1),
      returnToHome: z.string().min(1),
      switchToDarkMode: z.string().min(1),
      switchToLightMode: z.string().min(1),
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
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      introduction: z.string().min(1),
      mediaLabel: z.string().min(1),
      media: mediaSchema.optional(),
    }),
    footer: z.object({
      title: z.string().min(1),
      placeholder: z.string().min(1),
    }),
  }),
});

const page = defineCollection({
  loader: glob({
    base: pagesContentDirectory,
    pattern: '*.md',
  }),
  schema: z.object({
    navigationId: z.enum([
      'about-frc',
      'about-xplore',
      'about-gh-frc',
      'robots',
      'achievements',
      'news',
      'sponsors',
      'contact',
    ]),
    order: z.number().int().min(1).max(8),
    layout: z.enum([
      'editorial',
      'robots',
      'competition-results',
      'news',
      'placeholder',
      'contact',
    ]),
    meta: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
    hero: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      introduction: z.string().min(1),
      mediaLabel: z.string().min(1).optional(),
      media: mediaSchema.optional(),
    }),
    home: z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      linkLabel: z.string().min(1),
      mediaLabel: z.string().min(1),
      media: mediaSchema.optional(),
    }),
    highlights: z.array(z.object({
      value: z.string().min(1),
      label: z.string().min(1),
    })).optional(),
    emptyState: emptyStateSchema.optional(),
    detailLinkLabel: z.string().min(1).optional(),
    seasons: z.array(z.object({
      season: z.string().min(1),
      event: z.string().min(1),
      summary: z.string().min(1),
      awards: z.array(z.string().min(1)),
      media: mediaSchema.optional(),
    })).optional(),
    contactMethods: z.array(z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      href: z.string().min(1).optional(),
    })).optional(),
    partners: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      introduction: z.string().min(1),
      items: z.array(z.object({
        name: z.string().min(1),
        website: z.url().optional(),
        surface: z.enum(['light', 'dark']).optional(),
        logo: imageMediaSchema.optional(),
      })).min(1),
      disclaimer: z.string().min(1),
    }).optional(),
    sources: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      introduction: z.string().min(1),
      reviewedOn: z.string().min(1),
      items: z.array(z.object({
        title: z.string().min(1),
        organization: z.string().min(1),
        url: z.url(),
      })).min(1),
    }).optional(),
  }),
});

const robot = defineCollection({
  loader: glob({
    base: robotsContentDirectory,
    pattern: '*.md',
  }),
  schema: z.discriminatedUnion('entryType', [
    z.object({
      entryType: z.literal('guide'),
    }),
    z.object({
      entryType: z.literal('robot'),
      title: z.string().min(1),
      season: z.string().min(1),
      summary: z.string().min(1),
      description: z.string().min(1),
      poster: mediaSchema,
      published: z.boolean().default(true),
    }),
  ]),
});

const news = defineCollection({
  loader: glob({
    base: newsContentDirectory,
    pattern: '*.md',
  }),
  schema: z.discriminatedUnion('entryType', [
    z.object({
      entryType: z.literal('guide'),
    }),
    z.object({
      entryType: z.literal('news'),
      title: z.string().min(1),
      summary: z.string().min(1),
      description: z.string().min(1),
      publishedAt: z.coerce.date(),
      cover: mediaSchema.optional(),
      published: z.boolean().default(true),
    }),
  ]),
});

export const collections = { news, page, robot, site };
