import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

type FaviconVariant = 'light' | 'dark';

const LOCAL_ASSET_ORIGIN = 'https://ghfrc.invalid';
const FAVICON_HASH_LENGTH = 12;

function resolvePublicAsset(src: string, publicRoot: string) {
  const assetUrl = new URL(src, LOCAL_ASSET_ORIGIN);

  if (assetUrl.origin !== LOCAL_ASSET_ORIGIN) {
    throw new Error(`Favicon assets must be local public files: ${src}`);
  }

  const resolvedRoot = resolve(publicRoot);
  const relativePath = decodeURIComponent(assetUrl.pathname).replace(/^\/+/, '');
  const assetPath = resolve(resolvedRoot, relativePath);

  if (assetPath !== resolvedRoot && !assetPath.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Favicon asset escapes the public directory: ${src}`);
  }

  return { assetPath, assetUrl };
}

export async function versionFavicon(
  src: string,
  variant: FaviconVariant,
  publicRoot = resolve(process.cwd(), 'public'),
): Promise<string> {
  const { assetPath, assetUrl } = resolvePublicAsset(src, publicRoot);
  const contents = await readFile(assetPath);
  const revision = createHash('sha256')
    .update(contents)
    .digest('hex')
    .slice(0, FAVICON_HASH_LENGTH);

  assetUrl.searchParams.set('favicon', `${revision}-${variant}`);
  return `${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}`;
}
