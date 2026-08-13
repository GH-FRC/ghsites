import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const sourceSiteConfig = join(contentRoot, 'config', 'site.yaml');

await access(sourceSiteConfig).catch(() => {
  throw new Error(`Content preparation failed: missing site config at ${sourceSiteConfig}`);
});

const siteConfig = parse(await readFile(sourceSiteConfig, 'utf8'));
const logoPublicPath = siteConfig?.site?.logo?.src;

if (typeof logoPublicPath !== 'string' || !logoPublicPath.startsWith('/content/')) {
  throw new Error('Content preparation failed: site.logo.src must start with /content/.');
}

const logoRelativePath = logoPublicPath.slice('/content/'.length);
const sourceLogo = join(contentRoot, 'media', logoRelativePath);
const stagedLogo = join(projectRoot, 'framework', 'public', 'content', logoRelativePath);

async function sha256(filePath) {
  const file = await readFile(filePath);
  return createHash('sha256').update(file).digest('hex');
}

await Promise.all([
  access(sourceLogo).catch(() => {
    throw new Error(`Content preparation failed: missing Logo at ${sourceLogo}`);
  }),
]);

await mkdir(dirname(stagedLogo), { recursive: true });
await copyFile(sourceLogo, stagedLogo);

const [sourceHash, stagedHash] = await Promise.all([sha256(sourceLogo), sha256(stagedLogo)]);

if (sourceHash !== stagedHash) {
  throw new Error('Logo staging failed: the copied file does not match the original.');
}

console.log(`Content prepared from ${contentRoot}. Logo SHA-256: ${sourceHash}`);
