import { z } from 'astro/zod';

const mediaBaseShape = {
  src: z.string().startsWith('/content/'),
  alt: z.string().min(1),
  intrinsicWidth: z.number().int().positive(),
  intrinsicHeight: z.number().int().positive(),
};

export const localizedImageSchema = z.object({
  ...mediaBaseShape,
  type: z.literal('image').default('image'),
});

const captionSchema = z.object({
  id: z.string().min(1),
  src: z.string().startsWith('/content/'),
  srclang: z.string().min(2),
  label: z.string().min(1),
  default: z.boolean().optional(),
});

export const localizedVideoSchema = z.object({
  ...mediaBaseShape,
  type: z.literal('video'),
  poster: z.string().startsWith('/content/').optional(),
  captions: z.array(captionSchema).optional(),
});

export const localizedMediaSchema = z.union([
  localizedVideoSchema,
  localizedImageSchema,
]);

const emptyStateSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  actionLabel: z.string().min(1).optional(),
  actionHref: z.string().startsWith('/').optional(),
}).refine(
  ({ actionLabel, actionHref }) => Boolean(actionLabel) === Boolean(actionHref),
  { message: 'Empty-state actions require both actionLabel and actionHref.' },
);

export const siteSchema = z.object({
  language: z.literal('zh-CN'),
  title: z.string().min(1),
  description: z.string().min(1),
  logo: localizedImageSchema,
  favicon: z.object({
    light: localizedImageSchema,
    dark: localizedImageSchema,
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
    languageNavigation: z.string().min(1),
  }),
  languageSwitcher: z.object({
    currentLanguage: z.string().min(1),
    options: z.object({
      'zh-cn': z.string().min(1),
      en: z.string().min(1),
    }),
    shortOptions: z.object({
      'zh-cn': z.string().min(1),
      en: z.string().min(1),
    }),
  }),
  achievementMessages: z.object({
    unlocked: z.string().min(1),
  }),
  placeholderKinds: z.object({
    text: z.string().min(1),
    media: z.string().min(1),
    item: z.string().min(1),
    news: z.string().min(1),
    sponsor: z.string().min(1),
    contact: z.string().min(1),
  }),
  navigation: z.object({
    'about-frc': z.string().min(1),
    'about-gh-frc': z.string().min(1),
    robots: z.string().min(1),
    sponsors: z.string().min(1),
    contact: z.string().min(1),
  }),
  hero: z.object({
    eyebrow: z.string().min(1),
    title: z.string().min(1),
    introduction: z.string().min(1),
    mediaLabel: z.string().min(1),
    media: localizedMediaSchema.optional(),
  }),
  footer: z.object({
    title: z.string().min(1),
    placeholder: z.string().min(1),
  }),
});

export const pageSchema = z.object({
  navigationId: z.enum([
    'about-frc',
    'about-gh-frc',
    'robots',
    'achievements',
    'news',
    'sponsors',
    'contact',
  ]),
  order: z.number().int().min(1).max(7),
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
    mediaCaption: z.string().min(1).optional(),
    media: localizedMediaSchema.optional(),
  }),
  home: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    linkLabel: z.string().min(1),
    mediaLabel: z.string().min(1),
    media: localizedMediaSchema.optional(),
  }),
  highlights: z.array(z.object({
    id: z.string().min(1),
    value: z.string().min(1),
    label: z.string().min(1),
  })).optional(),
  emptyState: emptyStateSchema.optional(),
  detailLinkLabel: z.string().min(1).optional(),
  seasons: z.array(z.object({
    id: z.string().min(1),
    season: z.string().min(1),
    event: z.string().min(1),
    summary: z.string().min(1),
    awards: z.array(z.string().min(1)),
    media: localizedMediaSchema.optional(),
  })).optional(),
  contactMethods: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    href: z.string().min(1).optional(),
  })).optional(),
  partners: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    introduction: z.string().min(1),
    items: z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      website: z.url().optional(),
      surface: z.enum(['light', 'dark']).optional(),
      logo: localizedImageSchema.optional(),
    })).min(1),
    disclaimer: z.string().min(1),
  }).optional(),
  sources: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    introduction: z.string().min(1),
    reviewedOn: z.string().min(1),
    items: z.array(z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      organization: z.string().min(1),
      url: z.url(),
    })).min(1),
  }).optional(),
});

export const robotSchema = z.discriminatedUnion('entryType', [
  z.object({
    entryType: z.literal('guide'),
  }),
  z.object({
    entryType: z.literal('robot'),
    title: z.string().min(1),
    season: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().min(1),
    poster: localizedMediaSchema,
    published: z.boolean().default(true),
  }),
]);

export const newsSchema = z.discriminatedUnion('entryType', [
  z.object({
    entryType: z.literal('guide'),
  }),
  z.object({
    entryType: z.literal('news'),
    title: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    cover: localizedMediaSchema.optional(),
    published: z.boolean().default(true),
  }),
]);

export const localeOverlaySchema = z.record(z.string(), z.unknown());

export type SiteContent = z.infer<typeof siteSchema>;
export type PageContent = z.infer<typeof pageSchema>;
export type LocalizedMedia = z.infer<typeof localizedMediaSchema>;
