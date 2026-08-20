import { isAbsolute, normalize, relative, sep } from 'node:path';

export function isPathWithinRoot(rootPath, candidatePath) {
  const relativePath = relative(rootPath, candidatePath);

  return (
    relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath)
  );
}

export function toSafeMediaPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/content/')) {
    throw new Error('Content preparation failed: media paths must start with /content/.');
  }

  const relativePath = normalize(publicPath.slice('/content/'.length));
  const pathSegments = relativePath.split(sep);

  if (
    relativePath === ''
    || relativePath === '.'
    || relativePath === '..'
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
    || pathSegments.includes('internal-references')
  ) {
    throw new Error(`Content preparation failed: unsafe media path ${publicPath}`);
  }

  return relativePath;
}

export function collectMediaPaths(value) {
  const mediaPaths = new Set();

  function visit(candidate, key) {
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => visit(item));
      return;
    }

    if (candidate && typeof candidate === 'object') {
      Object.entries(candidate).forEach(([childKey, childValue]) => visit(childValue, childKey));
      return;
    }

    if (key === 'src' && typeof candidate === 'string') {
      mediaPaths.add(toSafeMediaPath(candidate));
    }
  }

  visit(value);
  return [...mediaPaths].sort();
}
