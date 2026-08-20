import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import { collectMediaPaths, isPathWithinRoot } from './prepare-content-lib.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const localeConfigRoot = join(contentRoot, 'config', 'locales');
const contentConfigFiles = [
  join(localeConfigRoot, 'zh-CN', 'site.yaml'),
  join(localeConfigRoot, 'zh-CN', 'about-frc.yaml'),
  join(localeConfigRoot, 'en', 'site.yaml'),
  join(localeConfigRoot, 'en', 'about-frc.yaml'),
];

await Promise.all(contentConfigFiles.map((configFile) => access(configFile).catch(() => {
  throw new Error(`Content preparation failed: missing localized config at ${configFile}`);
})));

const localizedConfigs = await Promise.all(contentConfigFiles.map(async (configFile) => (
  parse(await readFile(configFile, 'utf8'))
)));

const stagingContentRoot = join(projectRoot, 'framework', 'public', 'content');

async function sha256(filePath) {
  const file = await readFile(filePath);
  return createHash('sha256').update(file).digest('hex');
}

const mediaPaths = [...new Set(localizedConfigs.flatMap(collectMediaPaths))].sort();
const selectedMediaRoot = join(contentRoot, 'media');
const [resolvedContentRoot, resolvedMediaRoot] = await Promise.all([
  realpath(contentRoot),
  realpath(selectedMediaRoot),
]);

if (!isPathWithinRoot(resolvedContentRoot, resolvedMediaRoot)) {
  throw new Error('Content preparation failed: the media root escapes the selected content source.');
}

await rm(stagingContentRoot, { force: true, recursive: true });

for (const mediaPath of mediaPaths) {
  const sourceMedia = join(selectedMediaRoot, mediaPath);
  const stagedMedia = join(stagingContentRoot, mediaPath);

  const resolvedSourceMedia = await realpath(sourceMedia).catch(() => {
    throw new Error(`Content preparation failed: missing media at ${sourceMedia}`);
  });

  if (!isPathWithinRoot(resolvedMediaRoot, resolvedSourceMedia)) {
    throw new Error(
      `Content preparation failed: resolved media escapes the selected media root at ${sourceMedia}`,
    );
  }

  await mkdir(dirname(stagedMedia), { recursive: true });
  await copyFile(resolvedSourceMedia, stagedMedia);

  const [sourceHash, stagedHash] = await Promise.all([
    sha256(resolvedSourceMedia),
    sha256(stagedMedia),
  ]);

  if (sourceHash !== stagedHash) {
    throw new Error(`Media staging failed: ${mediaPath} does not match its source.`);
  }
}

console.log(`Content prepared from ${contentRoot}. Staged ${mediaPaths.length} verified media file(s).`);
