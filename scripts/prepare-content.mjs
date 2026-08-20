import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const sourceSiteConfig = join(contentRoot, 'config', 'site.yaml');
const sourceAboutFrcConfig = join(contentRoot, 'config', 'about-frc.yaml');

await Promise.all([
  access(sourceSiteConfig).catch(() => {
    throw new Error(`Content preparation failed: missing site config at ${sourceSiteConfig}`);
  }),
  access(sourceAboutFrcConfig).catch(() => {
    throw new Error(`Content preparation failed: missing About FRC config at ${sourceAboutFrcConfig}`);
  }),
]);

const siteConfig = parse(await readFile(sourceSiteConfig, 'utf8'));
const aboutFrcConfig = parse(await readFile(sourceAboutFrcConfig, 'utf8'));
const logoPublicPath = siteConfig?.site?.logo?.src;
const partnerLogoPublicPaths = aboutFrcConfig?.aboutFrc?.partners?.items
  ?.flatMap((item) => item?.logo?.src ?? []) ?? [];

if (typeof logoPublicPath !== 'string') {
  throw new Error('Content preparation failed: site.logo.src must be a string.');
}

const stagingContentRoot = join(projectRoot, 'framework', 'public', 'content');

function toSafeMediaPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/content/')) {
    throw new Error('Content preparation failed: media paths must start with /content/.');
  }

  const relativePath = normalize(publicPath.slice('/content/'.length));

  if (
    relativePath === ''
    || relativePath === '.'
    || relativePath === '..'
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
  ) {
    throw new Error(`Content preparation failed: unsafe media path ${publicPath}`);
  }

  return relativePath;
}

async function sha256(filePath) {
  const file = await readFile(filePath);
  return createHash('sha256').update(file).digest('hex');
}

const mediaPaths = [...new Set([logoPublicPath, ...partnerLogoPublicPaths].map(toSafeMediaPath))];

await rm(stagingContentRoot, { force: true, recursive: true });

for (const mediaPath of mediaPaths) {
  const sourceMedia = join(contentRoot, 'media', mediaPath);
  const stagedMedia = join(stagingContentRoot, mediaPath);

  await access(sourceMedia).catch(() => {
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
