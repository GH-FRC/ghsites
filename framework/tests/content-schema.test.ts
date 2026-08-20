import { describe, expect, it } from 'vitest';

import { localizedVideoSchema, siteSchema } from '../src/content-schema';

describe('localized content media schemas', () => {
  it('accepts a language-specific video, poster, and caption track', () => {
    expect(
      localizedVideoSchema.parse({
        type: 'video',
        src: '/content/videos/overview-en.mp4',
        title: 'Team overview',
        poster: {
          src: '/content/images/overview-en.jpg',
        },
        tracks: [
          {
            id: 'english-captions',
            src: '/content/captions/overview-en.vtt',
            kind: 'captions',
            srclang: 'en',
            label: 'English captions',
          },
        ],
      }),
    ).toMatchObject({
      type: 'video',
      src: '/content/videos/overview-en.mp4',
      title: 'Team overview',
    });
  });

  it('accepts localized video media through the real home-page content interface', () => {
    expect(
      siteSchema.shape.hero.parse({
        title: 'GHFRC',
        introPlaceholder: 'Introduction',
        mediaPlaceholder: 'Media',
        media: {
          type: 'video',
          src: '/content/videos/overview-en.mp4',
          title: 'Team overview',
        },
      }).media,
    ).toMatchObject({
      type: 'video',
      src: '/content/videos/overview-en.mp4',
    });
  });
});
