import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const sourceLogo = join(contentRoot, 'media', 'images', '光华剑桥图标.png');
const stagedLogo = join(
  projectRoot,
  'framework',
  'public',
  'content',
  'images',
  '光华剑桥图标.png',
);

async function sha256(filePath) {
  const file = await readFile(filePath);
  return createHash('sha256').update(file).digest('hex');
}

await mkdir(dirname(stagedLogo), { recursive: true });
await copyFile(sourceLogo, stagedLogo);

const [sourceHash, stagedHash] = await Promise.all([sha256(sourceLogo), sha256(stagedLogo)]);

if (sourceHash !== stagedHash) {
  throw new Error('Logo staging failed: the copied file does not match the original.');
}

console.log(`Content prepared. Logo SHA-256: ${sourceHash}`);
