import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { versionFavicon } from '../src/favicon-version';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { force: true, recursive: true })
  )));
});

async function createPublicAsset(contents: string) {
  const publicRoot = await mkdtemp(join(tmpdir(), 'ghfrc-favicon-'));
  const assetPath = join(publicRoot, 'content', 'icon.png');
  temporaryDirectories.push(publicRoot);
  await mkdir(dirname(assetPath), { recursive: true });
  await writeFile(assetPath, contents);
  return { assetPath, publicRoot };
}

function digest(contents: string) {
  return createHash('sha256').update(contents).digest('hex').slice(0, 12);
}

describe('favicon cache versioning', () => {
  it('uses the asset contents and appearance variant in the cache key', async () => {
    const contents = 'transparent white favicon';
    const { publicRoot } = await createPublicAsset(contents);
    const href = await versionFavicon('/content/icon.png?source=private', 'dark', publicRoot);
    const url = new URL(href, 'https://ghfrc.invalid');

    expect(url.pathname).toBe('/content/icon.png');
    expect(url.searchParams.get('source')).toBe('private');
    expect(url.searchParams.get('favicon')).toBe(`${digest(contents)}-dark`);
  });

  it('changes the cache key whenever the asset bytes change', async () => {
    const initialContents = 'old favicon';
    const updatedContents = 'new favicon';
    const { assetPath, publicRoot } = await createPublicAsset(initialContents);
    const initialHref = await versionFavicon('/content/icon.png', 'light', publicRoot);

    await writeFile(assetPath, updatedContents);
    const updatedHref = await versionFavicon('/content/icon.png', 'light', publicRoot);

    expect(updatedHref).not.toBe(initialHref);
    expect(updatedHref).toContain(`favicon=${digest(updatedContents)}-light`);
  });

  it('rejects external favicon sources', async () => {
    const { publicRoot } = await createPublicAsset('favicon');

    await expect(versionFavicon('https://example.com/icon.png', 'dark', publicRoot))
      .rejects.toThrow('Favicon assets must be local public files');
  });
});
