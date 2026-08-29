import { describe, expect, it } from 'vitest';

import { pageSchema } from '../src/content-schema';

const example = {
  navigationId: 'about-gh-frc',
  order: 2,
  layout: 'editorial',
  meta: { title: 'Our club', description: 'A community robotics club.' },
  hero: { eyebrow: 'Robotics', title: 'Our club', introduction: 'Learning by building.' },
  home: {
    title: 'Our club', summary: 'Learn about our club.',
    linkLabel: 'Learn more', mediaLabel: 'Club poster',
  },
};

describe('editorial media captions', () => {
  it('keeps existing content without a caption valid', () => {
    expect(pageSchema.parse(example).hero.mediaCaption).toBeUndefined();
  });

  it('preserves an optional public attribution caption', () => {
    const result = pageSchema.parse({
      ...example,
      hero: {
        ...example.hero,
        mediaCaption: 'Recruitment poster with attribution.',
        media: {
          src: '/content/images/poster.webp',
          alt: 'Robotics recruitment poster',
          intrinsicWidth: 1024,
          intrinsicHeight: 1536,
        },
      },
    });
    expect(result.hero.mediaCaption).toBe('Recruitment poster with attribution.');
    expect(result.hero.media?.intrinsicHeight).toBe(1536);
  });

  it('does not allow an empty caption', () => {
    expect(pageSchema.safeParse({
      ...example,
      hero: { ...example.hero, mediaCaption: '' },
    }).success).toBe(false);
  });
});
