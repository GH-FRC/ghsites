import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertPathHasNoSymbolicLinks,
  collectReferencedMediaPaths,
  discoverContentSourceFiles,
  resetPreparedContentState,
} from './prepare-content-lib.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const stagingContentRoot = join(projectRoot, 'framework', 'public', 'content');
const contentDataStore = join(projectRoot, 'framework', 'node_modules', '.astro', 'data-store.json');
const sourceMediaRoot = join(contentRoot, 'media');

async function sha256(filePath) {
  const file = await readFile(filePath);
  return createHash('sha256').update(file).digest('hex');
}

await resetPreparedContentState({ stagingContentRoot, contentDataStore });

const sourceFiles = await discoverContentSourceFiles(contentRoot);
const sourceTexts = await Promise.all(
  sourceFiles.map((sourceFile) => readFile(sourceFile, 'utf8')),
);
const mediaPaths = collectReferencedMediaPaths(sourceTexts);

for (const mediaPath of mediaPaths) {
  const sourceMedia = join(sourceMediaRoot, mediaPath);
  const stagedMedia = join(stagingContentRoot, mediaPath);

  await assertPathHasNoSymbolicLinks(sourceMediaRoot, sourceMedia).catch((error) => {
    if (error?.code !== 'ENOENT') {
      throw error;
    }

    throw new Error(`Content preparation failed: missing media at ${sourceMedia}`);
  });

  await mkdir(dirname(stagedMedia), { recursive: true });
  await copyFile(sourceMedia, stagedMedia);

  const [sourceHash, stagedHash] = await Promise.all([
    sha256(sourceMedia),
    sha256(stagedMedia),
  ]);

  if (sourceHash !== stagedHash) {
    throw new Error(`Media staging failed: ${mediaPath} does not match its source.`);
  }
}

console.log(`Content prepared from ${contentRoot}. Staged ${mediaPaths.length} verified media file(s).`);
