import { describe, expect, it } from 'vitest';

import { isVideoMedia, type MediaReference } from '../src/media-reference';

const baseMedia = {
  src: '/content/images/example.png',
  alt: 'Example media',
  intrinsicWidth: 1600,
  intrinsicHeight: 900,
};

describe('media references', () => {
  it('treats a legacy media reference without a type as an image', () => {
    expect(isVideoMedia(baseMedia)).toBe(false);
  });

  it('treats an explicit image reference as an image', () => {
    const media: MediaReference = { ...baseMedia, type: 'image' };

    expect(isVideoMedia(media)).toBe(false);
  });

  it('recognizes video references with optional poster and caption tracks', () => {
    const media: MediaReference = {
      ...baseMedia,
      type: 'video',
      src: '/content/videos/example.mp4',
      poster: '/content/images/example-poster.jpg',
      captions: [{
        src: '/content/captions/example-zh-CN.vtt',
        srclang: 'zh-CN',
        label: '简体中文',
        default: true,
      }],
    };

    expect(isVideoMedia(media)).toBe(true);
  });
});
