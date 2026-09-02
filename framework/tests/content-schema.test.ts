import { describe, expect, it } from 'vitest';

import {
  eventSchema,
  localizedVideoSchema,
  pageSchema,
  siteSchema,
} from '../src/content-schema';

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

  it('accepts a complete internal action on an empty state', () => {
    expect(
      pageSchema.shape.emptyState.parse({
        eyebrow: 'Sponsors',
        title: 'No sponsors yet',
        body: 'We are looking for our first sponsor.',
        actionLabel: 'Become our first sponsor',
        actionHref: '/en/contact/',
      }),
    ).toMatchObject({
      actionLabel: 'Become our first sponsor',
      actionHref: '/en/contact/',
    });
  });

  it('rejects an incomplete empty-state action', () => {
    expect(() => pageSchema.shape.emptyState.parse({
      eyebrow: 'Sponsors',
      title: 'No sponsors yet',
      body: 'We are looking for our first sponsor.',
      actionLabel: 'Become our first sponsor',
    })).toThrow();
  });

  it('requires all featured-event homepage fields together', () => {
    expect(() => siteSchema.shape.hero.parse({
      eyebrow: 'GHFRC',
      title: 'Home',
      introduction: 'Introduction',
      mediaLabel: 'Media',
      featuredEventId: 'info-session',
    })).toThrow('Featured events require an id, label, and link label.');
  });

  it('accepts a complete event with a valid time range', () => {
    expect(eventSchema.parse({
      entryType: 'event',
      title: 'Example Robotics Open House',
      summary: 'Public summary',
      description: 'Search description',
      startsAt: '2030-01-10T10:00:00+08:00',
      endsAt: '2030-01-10T11:00:00+08:00',
      dateText: '10 January 2030',
      timeText: '10:00-11:00',
      venue: 'Workshop A',
      cover: {
        type: 'image',
        src: '/content/images/events/example-event.png',
        alt: 'Students viewing a robotics demonstration',
        intrinsicWidth: 1600,
        intrinsicHeight: 1200,
      },
      registration: {
        name: 'Event updates',
        instruction: 'See the organizer notice.',
      },
    })).toMatchObject({
      entryType: 'event',
      published: true,
    });
  });
});
