import { z } from 'astro/zod';

const identifiedTextSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const localizedImageSchema = z.object({
  src: z.string().startsWith('/content/'),
  alt: z.string().min(1),
  intrinsicWidth: z.number().int().positive(),
  intrinsicHeight: z.number().int().positive(),
});

export const localizedVideoSchema = z.object({
  type: z.literal('video'),
  src: z.string().startsWith('/content/'),
  title: z.string().min(1),
  poster: z.object({
    src: z.string().startsWith('/content/'),
  }).optional(),
  tracks: z.array(z.object({
    id: z.string().min(1),
    src: z.string().startsWith('/content/'),
    kind: z.enum(['captions', 'subtitles']),
    srclang: z.string().min(2),
    label: z.string().min(1),
  })).optional(),
});

export const localizedMediaSchema = z.union([
  localizedImageSchema.extend({ type: z.literal('image') }),
  localizedVideoSchema,
]);

const sectionSchema = z.object({
  heading: z.string().min(1),
  bodyPlaceholder: z.string().min(1),
  mediaPlaceholder: z.string().min(1).optional(),
  media: localizedMediaSchema.optional(),
  itemPlaceholders: z.array(identifiedTextSchema),
});

export const siteSchema = z.object({
  language: z.literal('zh-CN'),
  title: z.string().min(1),
  description: z.string().min(1),
  logo: localizedImageSchema,
  accessibility: z.object({
    mainNavigation: z.string().min(1),
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
  placeholderKinds: z.object({
    text: z.string().min(1),
    media: z.string().min(1),
    item: z.string().min(1),
    news: z.string().min(1),
    sponsor: z.string().min(1),
    contact: z.string().min(1),
  }),
  achievementMessages: z.object({
    unlocked: z.string().min(1),
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
    media: localizedMediaSchema.optional(),
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
});

const paragraphListSchema = z.array(identifiedTextSchema).min(1);

export const aboutFrcSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  breadcrumb: z.object({
    ariaLabel: z.string().min(1),
    homeLabel: z.string().min(1),
    currentLabel: z.string().min(1),
  }),
  hero: z.object({
    eyebrow: z.string().min(1),
    title: z.string().min(1),
    introduction: z.string().min(1),
    highlights: z.array(z.object({
      id: z.string().min(1),
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
      id: z.string().min(1),
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
      id: z.string().min(1),
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
      id: z.string().min(1),
      heading: z.string().min(1),
      body: z.string().min(1),
    })).min(1),
  }),
  higherEducation: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    introduction: z.string().min(1),
    cases: z.array(z.object({
      id: z.string().min(1),
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
      id: z.string().min(1),
      name: z.string().min(1),
      website: z.url().optional(),
      surface: z.enum(['light', 'dark']).optional(),
      logo: localizedImageSchema.optional(),
    })).min(1),
    disclaimer: z.string().min(1),
  }),
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
  }),
});

export const localeOverlaySchema = z.record(z.string(), z.unknown());

export type SiteContent = z.infer<typeof siteSchema>;
export type AboutFrcContent = z.infer<typeof aboutFrcSchema>;
export type LocalizedMedia = z.infer<typeof localizedMediaSchema>;
