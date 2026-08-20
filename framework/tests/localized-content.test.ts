import { describe, expect, it } from 'vitest';

import { resolveLocalizedContent } from '../src/i18n/localized-content';

describe('localized content resolution', () => {
  it('uses translated fields while recursively falling back for missing and blank strings', () => {
    const base = {
      title: '示例标题',
      hero: {
        heading: '中文标题',
        introduction: '中文介绍',
      },
    };
    const english = {
      title: 'Example title',
      hero: {
        heading: '   ',
      },
    };

    const result = resolveLocalizedContent(base, english);

    expect(result.content).toEqual({
      title: 'Example title',
      hero: {
        heading: '中文标题',
        introduction: '中文介绍',
      },
    });
    expect(result.missingTranslations).toEqual([
      'hero.heading',
      'hero.introduction',
    ]);
    expect(result.fallbackPaths).toEqual(
      new Set(['hero.heading', 'hero.introduction']),
    );
    expect(result.isComplete).toBe(false);
  });

  it('allows localized media while excluding structural fields from translation completeness', () => {
    const base = {
      language: 'zh-CN',
      id: 'hero-media',
      index: '01',
      name: 'GHFRC',
      website: 'https://example.com/',
      url: 'https://example.com/source',
      surface: 'light',
      logo: {
        src: '/content/images/hero-zh.png',
        alt: '中文图片说明',
        intrinsicWidth: 400,
        intrinsicHeight: 138,
      },
      sharedImage: {
        src: '/content/images/shared.png',
        alt: '共用图片说明',
      },
      video: {
        type: 'video' as const,
        src: '/content/videos/overview-zh.mp4',
        title: '队伍介绍',
        poster: { src: '/content/images/overview-shared.jpg' },
        tracks: [
          {
            id: 'captions',
            src: '/content/captions/overview-zh.vtt',
            kind: 'captions',
            srclang: 'zh-CN',
            label: '中文字幕',
          },
        ],
      },
    };
    const english = {
      name: 'GHFRC',
      logo: {
        src: '/content/images/hero-en.png',
        alt: 'English image description',
      },
      sharedImage: {
        alt: 'Shared image description',
      },
      video: {
        src: '/content/videos/overview-en.mp4',
        title: 'Team overview',
        tracks: [
          {
            id: 'captions',
            src: '/content/captions/overview-en.vtt',
            srclang: 'en',
            label: 'English captions',
          },
        ],
      },
    };

    const result = resolveLocalizedContent(base, english);

    expect(result.content.logo).toEqual({
      src: '/content/images/hero-en.png',
      alt: 'English image description',
      intrinsicWidth: 400,
      intrinsicHeight: 138,
    });
    expect(result.content.sharedImage).toEqual({
      src: '/content/images/shared.png',
      alt: 'Shared image description',
    });
    expect(result.content.video).toEqual({
      type: 'video',
      src: '/content/videos/overview-en.mp4',
      title: 'Team overview',
      poster: { src: '/content/images/overview-shared.jpg' },
      tracks: [
        {
          id: 'captions',
          src: '/content/captions/overview-en.vtt',
          kind: 'captions',
          srclang: 'en',
          label: 'English captions',
        },
      ],
    });
    expect(result.missingTranslations).toEqual([]);
    expect(result.fallbackPaths).toEqual(new Set());
    expect(result.isComplete).toBe(true);
  });

  it('allows a locale overlay to add optional media that the base locale omits', () => {
    const base = {
      hero: {
        heading: '中文标题',
      },
    };
    const english = {
      hero: {
        media: {
          type: 'video',
          src: '/content/videos/overview-en.mp4',
          title: 'Team overview',
        },
      },
    } as unknown as Parameters<typeof resolveLocalizedContent<typeof base>>[1];

    const result = resolveLocalizedContent(base, english);

    expect(result.content).toEqual({
      hero: {
        heading: '中文标题',
        media: {
          type: 'video',
          src: '/content/videos/overview-en.mp4',
          title: 'Team overview',
        },
      },
    });
    expect(result.missingTranslations).toEqual(['hero.heading']);
  });

  it('replaces the complete media object when a locale changes its media type', () => {
    const base = {
      hero: {
        media: {
          type: 'image' as const,
          src: '/content/images/overview-zh.png',
          alt: '中文图片说明',
          intrinsicWidth: 1600,
          intrinsicHeight: 900,
        },
      },
    };
    const english = {
      hero: {
        media: {
          type: 'video',
          src: '/content/videos/overview-en.mp4',
          title: 'Team overview',
          tracks: [
            {
              id: 'captions',
              src: '/content/captions/overview-en.vtt',
              kind: 'captions',
              srclang: 'en',
              label: 'English captions',
            },
          ],
        },
      },
    } as unknown as Parameters<typeof resolveLocalizedContent<typeof base>>[1];

    const result = resolveLocalizedContent(base, english);

    expect(result.content.hero.media).toEqual({
      type: 'video',
      src: '/content/videos/overview-en.mp4',
      title: 'Team overview',
      tracks: [
        {
          id: 'captions',
          src: '/content/captions/overview-en.vtt',
          kind: 'captions',
          srclang: 'en',
          label: 'English captions',
        },
      ],
    });
    expect(result.content.hero.media).not.toHaveProperty('alt');
    expect(result.content.hero.media).not.toHaveProperty('intrinsicWidth');
    expect(result.missingTranslations).toEqual([]);
  });

  it('treats visible name fields as translatable content', () => {
    const result = resolveLocalizedContent(
      { partner: { id: 'example', name: '示例合作机构' } },
      { partner: { id: 'example' } },
    );

    expect(result.missingTranslations).toEqual(['partner.name']);
    expect(result.isComplete).toBe(false);
  });

  it('merges object arrays by stable id while preserving the base content order', () => {
    const base = {
      highlights: [
        { id: 'students', value: '学生', label: '参与学生' },
        { id: 'teams', value: '队伍', label: '参赛队伍' },
      ],
    };
    const english = {
      highlights: [
        { id: 'teams', label: 'Teams' },
        { id: 'students', value: 'Students' },
      ],
    };

    const result = resolveLocalizedContent(base, english);

    expect(result.content.highlights).toEqual([
      { id: 'students', value: 'Students', label: '参与学生' },
      { id: 'teams', value: '队伍', label: 'Teams' },
    ]);
    expect(result.missingTranslations).toEqual([
      'highlights[id=students].label',
      'highlights[id=teams].value',
    ]);
  });

  it('rejects object-array overlays whose items omit their stable id', () => {
    const base = {
      highlights: [{ id: 'students', label: '参与学生' }],
    };
    const invalidEnglish = {
      highlights: [{ label: 'Students' }],
    } as unknown as Parameters<typeof resolveLocalizedContent<typeof base>>[1];

    expect(() => resolveLocalizedContent(base, invalidEnglish)).toThrow(
      'Translation overlay item at "highlights[0]" must include a stable id.',
    );
  });

  it('rejects duplicate ids in an object-array overlay', () => {
    const base = {
      highlights: [{ id: 'students', label: '参与学生' }],
    };
    const invalidEnglish = {
      highlights: [
        { id: 'students', label: 'Students' },
        { id: 'students', label: 'Student participants' },
      ],
    };

    expect(() => resolveLocalizedContent(base, invalidEnglish)).toThrow(
      'Translation overlay at "highlights" contains duplicate id "students".',
    );
  });

  it('rejects duplicate stable ids in the base content', () => {
    const invalidBase = {
      highlights: [
        { id: 'students', label: '参与学生' },
        { id: 'students', label: '学生人数' },
      ],
    };

    expect(() => resolveLocalizedContent(invalidBase, {})).toThrow(
      'Base content at "highlights" contains duplicate id "students".',
    );
  });

  it('rejects object-array overlays whose stable ids do not exist in the base content', () => {
    const base = {
      highlights: [{ id: 'students', label: '参与学生' }],
    };
    const invalidEnglish = {
      highlights: [{ id: 'student-count', label: 'Students' }],
    } as unknown as Parameters<typeof resolveLocalizedContent<typeof base>>[1];

    expect(() => resolveLocalizedContent(base, invalidEnglish)).toThrow(
      'Translation overlay at "highlights" contains unknown id "student-count".',
    );
  });

  it('rejects unknown overlay fields instead of silently ignoring a misspelled key', () => {
    const base = {
      hero: {
        heading: '中文标题',
      },
    };
    const invalidEnglish = {
      hero: {
        haeding: 'English heading',
      },
    } as unknown as Parameters<typeof resolveLocalizedContent<typeof base>>[1];

    expect(() => resolveLocalizedContent(base, invalidEnglish)).toThrow(
      'Translation overlay at "hero" contains unknown field "haeding".',
    );
  });

  it('rejects inherited object names when they are supplied as overlay fields', () => {
    const base = {
      hero: {
        heading: '中文标题',
      },
    };
    const invalidEnglish = {
      hero: {
        toString: 'unexpected field',
      },
    } as unknown as Parameters<typeof resolveLocalizedContent<typeof base>>[1];

    expect(() => resolveLocalizedContent(base, invalidEnglish)).toThrow(
      'Translation overlay at "hero" contains unknown field "toString".',
    );
  });
});
