import { describe, expect, it } from 'vitest';

import {
  collectMediaPaths,
  isPathWithinRoot,
  toSafeMediaPath,
} from '../../scripts/prepare-content-lib.mjs';

describe('localized media preparation', () => {
  it('collects the unique media referenced by every localized content tree', () => {
    expect(
      collectMediaPaths({
        site: {
          logo: { src: '/content/images/logo.png' },
          localizedHero: { src: '/content/images/hero-en.png' },
          repeatedLogo: { src: '/content/images/logo.png' },
        },
      }),
    ).toEqual(['images/hero-en.png', 'images/logo.png']);
  });

  it.each([
    '/content/../internal-references/video.mov',
    '/content/internal-references/video.mov',
    'https://example.com/image.png',
  ])('rejects media outside the deployable content boundary: %s', (path) => {
    expect(() => toSafeMediaPath(path)).toThrow('Content preparation failed');
  });

  it('recognizes when a resolved media path escapes the selected media root', () => {
    expect(
      isPathWithinRoot('/content/media', '/content/media/images/logo.png'),
    ).toBe(true);
    expect(
      isPathWithinRoot('/content/media', '/content/internal-references/video.mov'),
    ).toBe(false);
  });
});
