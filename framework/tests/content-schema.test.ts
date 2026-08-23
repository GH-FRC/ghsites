import { describe, expect, it } from 'vitest';

import { localizedVideoSchema, siteSchema } from '../src/content-schema';

describe('localized content media schemas', () => {
  it('accepts a language-specific video, poster, and caption track', () => {
    expect(
      localizedVideoSchema.parse({
        type: 'video',
        src: '/content/videos/overview-en.mp4',
        alt: 'Team overview',
        intrinsicWidth: 1920,
        intrinsicHeight: 1080,
        poster: '/content/images/overview-en.jpg',
        captions: [
          {
            id: 'english-captions',
            src: '/content/captions/overview-en.vtt',
            srclang: 'en',
            label: 'English captions',
          },
        ],
      }),
    ).toMatchObject({
      type: 'video',
      src: '/content/videos/overview-en.mp4',
      alt: 'Team overview',
    });
  });

  it('accepts localized video media through the real home-page content interface', () => {
    expect(
      siteSchema.shape.hero.parse({
        eyebrow: 'Team website',
        title: 'GHFRC',
        introduction: 'Introduction',
        mediaLabel: 'Media',
        media: {
          type: 'video',
          src: '/content/videos/overview-en.mp4',
          alt: 'Team overview',
          intrinsicWidth: 1920,
          intrinsicHeight: 1080,
        },
      }).media,
    ).toMatchObject({
      type: 'video',
      src: '/content/videos/overview-en.mp4',
    });
  });
});
