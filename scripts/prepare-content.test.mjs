import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

import {
  assertPathHasNoSymbolicLinks,
  collectReferencedMediaPaths,
  discoverContentSourceFiles,
  extractMediaReferences,
  resetPreparedContentState,
  toSafeMediaPath,
} from './prepare-content-lib.mjs';

test('extracts media references from YAML and Markdown text', () => {
  const source = `
logo:
  src: /content/images/team-logo.png

![Robot poster](/content/images/robots/2026-poster.webp)
<video src="/content/videos/reveal.mp4"></video>
`;

  assert.deepEqual(extractMediaReferences(source), [
    '/content/images/team-logo.png',
    '/content/images/robots/2026-poster.webp',
    '/content/videos/reveal.mp4',
  ]);
});

test('ignores content directory examples that do not name a media file', () => {
  const source = `
Store images under \`/content/images/\` and videos under /content/videos/.
logo: /content/images/team-logo.png
`;

  assert.deepEqual(extractMediaReferences(source), [
    '/content/images/team-logo.png',
  ]);
});

test('rejects traversal, absolute, encoded, and internal-reference paths', () => {
  assert.equal(
    toSafeMediaPath('/content/images/team-logo.png'),
    'images/team-logo.png',
  );

  const unsafeReferences = [
    '/content/../private.mov',
    '/content/images/../private.png',
    '/content/images\\..\\private.png',
    '/content/%2e%2e/private.mov',
    '/content//etc/passwd',
    '/content/C:\\private.mov',
    '/content/internal-references/private.mov',
    '/content/images/internal-references/private.mov',
  ];

  for (const reference of unsafeReferences) {
    assert.throws(
      () => toSafeMediaPath(reference),
      /Content preparation failed: unsafe media path/,
      reference,
    );
  }
});

test('deduplicates repeated media references across text sources', () => {
  const sourceTexts = [
    'src: /content/images/shared.png\nposter: /content/images/shared.png',
    '![Shared](/content/images/shared.png)\nvideo: /content/videos/demo.mp4',
  ];

  assert.deepEqual(collectReferencedMediaPaths(sourceTexts), [
    'images/shared.png',
    'videos/demo.mp4',
  ]);
});

test('clears staged media and the Astro content cache before changing content sources', async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'ghfrc-content-reset-'));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const stagingContentRoot = join(temporaryRoot, 'public', 'content');
  const contentDataStore = join(temporaryRoot, 'node_modules', '.astro', 'data-store.json');
  await mkdir(stagingContentRoot, { recursive: true });
  await mkdir(dirname(contentDataStore), { recursive: true });
  await writeFile(join(stagingContentRoot, 'private-logo.png'), 'private media', 'utf8');
  await writeFile(contentDataStore, 'private content cache', 'utf8');

  await resetPreparedContentState({ stagingContentRoot, contentDataStore });

  await assert.rejects(access(stagingContentRoot), { code: 'ENOENT' });
  await assert.rejects(access(contentDataStore), { code: 'ENOENT' });
});

test('discovers configured Markdown source trees recursively', async (t) => {
  const contentRoot = await mkdtemp(join(tmpdir(), 'ghfrc-content-sources-'));
  t.after(() => rm(contentRoot, { force: true, recursive: true }));

  const sourceFiles = [
    'config/site.yaml',
    'pages/frc.md',
    'pages/xplore.md',
    'pages/team.md',
    'pages/robots.md',
    'pages/achievements.md',
    'pages/news.md',
    'pages/sponsors.md',
    'pages/nested/contact.md',
    'robots/seasons/2026.md',
    'news/2026/kickoff.md',
  ];

  await Promise.all(sourceFiles.map(async (sourceFile) => {
    const filePath = join(contentRoot, sourceFile);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${sourceFile}\n`, 'utf8');
  }));

  await mkdir(join(contentRoot, 'internal-references'), { recursive: true });
  await writeFile(
    join(contentRoot, 'internal-references', 'private.md'),
    '/content/internal-references/private.mov\n',
    'utf8',
  );
  await writeFile(join(contentRoot, 'news', 'draft.txt'), 'ignored\n', 'utf8');

  const discoveredFiles = await discoverContentSourceFiles(contentRoot);

  assert.deepEqual(
    discoveredFiles.map((filePath) => relative(contentRoot, filePath)),
    [...sourceFiles].sort(),
  );
});

test('requires exactly eight page Markdown files', async (t) => {
  const contentRoot = await mkdtemp(join(tmpdir(), 'ghfrc-content-pages-'));
  t.after(() => rm(contentRoot, { force: true, recursive: true }));

  await mkdir(join(contentRoot, 'config'), { recursive: true });
  await mkdir(join(contentRoot, 'pages'), { recursive: true });
  await writeFile(join(contentRoot, 'config', 'site.yaml'), 'site: example\n', 'utf8');

  for (let pageNumber = 1; pageNumber <= 7; pageNumber += 1) {
    await writeFile(
      join(contentRoot, 'pages', `page-${pageNumber}.md`),
      `page ${pageNumber}\n`,
      'utf8',
    );
  }

  await assert.rejects(
    discoverContentSourceFiles(contentRoot),
    /expected 8 Markdown page files in .*\/pages, found 7/,
  );
});

test('rejects media paths containing symbolic links', async (t) => {
  const contentRoot = await mkdtemp(join(tmpdir(), 'ghfrc-content-symlink-'));
  t.after(() => rm(contentRoot, { force: true, recursive: true }));

  const mediaRoot = join(contentRoot, 'media');
  const realImagesDirectory = join(contentRoot, 'real-images');
  await mkdir(mediaRoot, { recursive: true });
  await mkdir(realImagesDirectory, { recursive: true });
  await writeFile(join(realImagesDirectory, 'logo.png'), 'image bytes', 'utf8');
  await symlink(realImagesDirectory, join(mediaRoot, 'images'));

  await assert.rejects(
    assertPathHasNoSymbolicLinks(mediaRoot, join(mediaRoot, 'images', 'logo.png')),
    /Content preparation failed: symbolic links are not allowed/,
  );
});

test('rejects symbolic links in recursively discovered text sources', async (t) => {
  const contentRoot = await mkdtemp(join(tmpdir(), 'ghfrc-content-source-link-'));
  t.after(() => rm(contentRoot, { force: true, recursive: true }));

  await mkdir(join(contentRoot, 'config'), { recursive: true });
  await mkdir(join(contentRoot, 'pages'), { recursive: true });
  await mkdir(join(contentRoot, 'robots'), { recursive: true });
  await writeFile(join(contentRoot, 'config', 'site.yaml'), 'site: example\n', 'utf8');

  for (let pageNumber = 1; pageNumber <= 8; pageNumber += 1) {
    await writeFile(
      join(contentRoot, 'pages', `page-${pageNumber}.md`),
      `page ${pageNumber}\n`,
      'utf8',
    );
  }

  const linkedSource = join(contentRoot, 'linked-robot.md');
  await writeFile(linkedSource, 'linked source\n', 'utf8');
  await symlink(linkedSource, join(contentRoot, 'robots', '2026.md'));

  await assert.rejects(
    discoverContentSourceFiles(contentRoot),
    /Content preparation failed: symbolic links are not allowed/,
  );
});
