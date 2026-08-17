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
const aboutFrcContentFile = resolve(contentRoot, 'config', 'about-frc.yaml');

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

const paragraphListSchema = z.array(z.string().min(1)).min(1);

const aboutFrc = defineCollection({
  loader: file(aboutFrcContentFile),
  schema: z.object({
    meta: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
    breadcrumb: z.object({
      homeLabel: z.string().min(1),
      currentLabel: z.string().min(1),
    }),
    hero: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      introduction: z.string().min(1),
      highlights: z.array(z.object({
        value: z.string().min(1),
        label: z.string().min(1),
      })).min(1),
    }),
    overview: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      paragraphs: paragraphListSchema,
    }),
    competition: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      introduction: z.string().min(1),
      stages: z.array(z.object({
        index: z.string().min(1),
        heading: z.string().min(1),
        body: z.string().min(1),
      })).min(1),
    }),
    impact: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      paragraphs: paragraphListSchema,
      statistics: z.array(z.object({
        value: z.string().min(1),
        label: z.string().min(1),
        context: z.string().min(1),
      })).min(1),
    }),
    development: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      introduction: z.string().min(1),
      items: z.array(z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
      })).min(1),
    }),
    higherEducation: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      introduction: z.string().min(1),
      cases: z.array(z.object({
        year: z.string().min(1),
        heading: z.string().min(1),
        body: z.string().min(1),
      })).min(1),
      disclaimer: z.string().min(1),
    }),
    scholarships: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      paragraphs: paragraphListSchema,
      highlight: z.object({
        value: z.string().min(1),
        label: z.string().min(1),
        note: z.string().min(1),
      }),
    }),
    partners: z.object({
      eyebrow: z.string().min(1),
      heading: z.string().min(1),
      introduction: z.string().min(1),
      items: z.array(z.object({
        name: z.string().min(1),
        website: z.url().optional(),
        surface: z.enum(['light', 'dark']).optional(),
        logo: z.object({
          src: z.string().startsWith('/content/'),
          alt: z.string().min(1),
          intrinsicWidth: z.number().int().positive(),
          intrinsicHeight: z.number().int().positive(),
        }).optional(),
      })).min(1),
      disclaimer: z.string().min(1),
    }),
    sources: z.object({
      heading: z.string().min(1),
      introduction: z.string().min(1),
      reviewedOn: z.string().min(1),
      items: z.array(z.object({
        title: z.string().min(1),
        organization: z.string().min(1),
        url: z.url(),
      })).min(1),
    }),
  }),
});

export const collections = { aboutFrc, site };
