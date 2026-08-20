import { lstat, readdir, rm } from 'node:fs/promises';
import {
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path';

const CONTENT_MEDIA_REFERENCE = /\/content\/[^\s"'`()<>\[\]{},?#]+/gu;

export function extractMediaReferences(sourceText) {
  return (sourceText.match(CONTENT_MEDIA_REFERENCE) ?? [])
    .map((reference) => reference.replace(/[.!;:]+$/u, ''))
    .filter((reference) => !reference.endsWith('/'));
}

export function toSafeMediaPath(publicPath) {
  const unsafePathError = () => new Error(
    `Content preparation failed: unsafe media path ${String(publicPath)}`,
  );

  if (
    typeof publicPath !== 'string'
    || !publicPath.startsWith('/content/')
    || publicPath.includes('\\')
    || publicPath.includes('?')
    || publicPath.includes('#')
  ) {
    throw unsafePathError();
  }

  let relativePath;

  try {
    relativePath = decodeURIComponent(publicPath.slice('/content/'.length));
  } catch {
    throw unsafePathError();
  }

  const pathSegments = relativePath.split('/');

  if (
    relativePath === ''
    || relativePath.includes('\\')
    || relativePath.includes('\0')
    || isAbsolute(relativePath)
    || win32.isAbsolute(relativePath)
    || pathSegments.some((segment) => (
      segment === ''
      || segment === '.'
      || segment === '..'
      || segment.toLowerCase() === 'internal-references'
    ))
  ) {
    throw unsafePathError();
  }

  return pathSegments.join('/');
}

export function collectReferencedMediaPaths(sourceTexts) {
  return [...new Set(
    sourceTexts.flatMap(extractMediaReferences).map(toSafeMediaPath),
  )];
}

export async function resetPreparedContentState({ stagingContentRoot, contentDataStore }) {
  await Promise.all([
    rm(stagingContentRoot, { force: true, recursive: true }),
    rm(contentDataStore, { force: true }),
  ]);
}

export async function assertPathHasNoSymbolicLinks(rootPath, targetPath) {
  const resolvedRoot = resolve(rootPath);
  const resolvedTarget = resolve(targetPath);
  const targetRelativePath = relative(resolvedRoot, resolvedTarget);

  if (
    targetRelativePath === '..'
    || targetRelativePath.startsWith(`..${sep}`)
    || isAbsolute(targetRelativePath)
  ) {
    throw new Error(`Content preparation failed: unsafe filesystem path ${targetPath}`);
  }

  const pathsToInspect = [resolvedRoot];
  let currentPath = resolvedRoot;

  for (const pathSegment of targetRelativePath.split(sep).filter(Boolean)) {
    currentPath = join(currentPath, pathSegment);
    pathsToInspect.push(currentPath);
  }

  for (const pathToInspect of pathsToInspect) {
    const pathMetadata = await lstat(pathToInspect);

    if (pathMetadata.isSymbolicLink()) {
      throw new Error(
        `Content preparation failed: symbolic links are not allowed (${pathToInspect}).`,
      );
    }
  }
}

async function discoverMarkdownFiles(directory, { optional = false } = {}) {
  let entries;

  try {
    const directoryMetadata = await lstat(directory);

    if (directoryMetadata.isSymbolicLink()) {
      throw new Error(
        `Content preparation failed: symbolic links are not allowed (${directory}).`,
      );
    }

    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (optional && error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const discoveredFiles = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(
        `Content preparation failed: symbolic links are not allowed (${entryPath}).`,
      );
    } else if (entry.isDirectory()) {
      discoveredFiles.push(...await discoverMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      discoveredFiles.push(entryPath);
    }
  }

  return discoveredFiles;
}

export async function discoverContentSourceFiles(contentRoot) {
  const siteConfig = join(contentRoot, 'config', 'site.yaml');
  await assertPathHasNoSymbolicLinks(contentRoot, siteConfig);
  const pagesDirectory = join(contentRoot, 'pages');
  const pageFiles = await discoverMarkdownFiles(pagesDirectory);

  if (pageFiles.length !== 8) {
    throw new Error(
      `Content preparation failed: expected 8 Markdown page files in ${pagesDirectory}, found ${pageFiles.length}.`,
    );
  }

  const robotFiles = await discoverMarkdownFiles(join(contentRoot, 'robots'), { optional: true });
  const newsFiles = await discoverMarkdownFiles(join(contentRoot, 'news'), { optional: true });

  return [siteConfig, ...pageFiles, ...robotFiles, ...newsFiles].sort();
}
