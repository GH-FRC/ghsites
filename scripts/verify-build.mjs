import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'framework', 'dist');
const canonicalRoutes = [
  '/frc/',
  '/xplore/',
  '/team/',
  '/robots/',
  '/achievements/',
  '/news/',
  '/sponsors/',
  '/contact/',
];
const expectedHtmlFiles = [
  'index.html',
  'about-frc/index.html',
  ...canonicalRoutes.map((route) => `${route.slice(1)}index.html`),
];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function toOutputPath(publicReference) {
  const referenceUrl = new URL(publicReference, 'https://ghfrc.org/');
  const pathname = decodeURIComponent(referenceUrl.pathname);

  if (pathname === '/') {
    return join(distRoot, 'index.html');
  }

  if (pathname.endsWith('/') || extname(pathname) === '') {
    return join(distRoot, pathname.slice(1), 'index.html');
  }

  return join(distRoot, pathname.slice(1));
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

for (const relativePath of expectedHtmlFiles) {
  assert.equal(
    await fileExists(join(distRoot, relativePath)),
    true,
    `Missing generated page: ${relativePath}`,
  );
}

for (const relativePath of expectedHtmlFiles.filter((path) => path !== 'about-frc/index.html')) {
  const html = await readFile(join(distRoot, relativePath), 'utf8');

  assert.equal(countMatches(html, /<title>/gu), 1, `${relativePath} must have one title.`);
  assert.equal(
    countMatches(html, /<meta name="description" content="[^"]+">/gu),
    1,
    `${relativePath} must have one description.`,
  );
  assert.match(html, /<html lang="zh-CN">/u, `${relativePath} must declare zh-CN.`);
  assert.equal(countMatches(html, /<h1(?:\s|>)/gu), 1, `${relativePath} must have one h1.`);
  assert.match(html, /data-site-header/u, `${relativePath} must include the shared header.`);

  const publicReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/gu)]
    .map((match) => match[1])
    .filter((reference) => (
      reference.startsWith('/')
      && !reference.startsWith('//')
    ));

  for (const reference of publicReferences) {
    assert.equal(
      await fileExists(toOutputPath(reference)),
      true,
      `${relativePath} contains a broken internal reference: ${reference}`,
    );
  }
}

const homepageHtml = await readFile(join(distRoot, 'index.html'), 'utf8');
let previousRoutePosition = -1;

for (const route of canonicalRoutes) {
  const routePosition = homepageHtml.indexOf(`href="${route}"`);
  assert.ok(routePosition > previousRoutePosition, `Homepage route order is incorrect at ${route}.`);
  previousRoutePosition = routePosition;
}

assert.doesNotMatch(
  homepageHtml,
  /href="#(?:about-frc|about-xplore|about-gh-frc|robots|achievements|news|sponsors|contact)"/u,
  'Homepage navigation must use independent routes instead of legacy section links.',
);

const sponsorsHtml = await readFile(join(distRoot, 'sponsors', 'index.html'), 'utf8');
assert.match(sponsorsHtml, /class="empty-state"/u, 'Sponsors must retain its empty state.');

const robotsHtml = await readFile(join(distRoot, 'robots', 'index.html'), 'utf8');
assert.match(robotsHtml, /poster-card--empty/u, 'Robots must show one generic poster when empty.');

const newsHtml = await readFile(join(distRoot, 'news', 'index.html'), 'utf8');
assert.match(newsHtml, /class="empty-state"/u, 'News must retain its empty state.');

const outputFiles = await collectFiles(distRoot);
for (const outputFile of outputFiles) {
  assert.doesNotMatch(outputFile, /\.(?:lfs|mov)$/iu, 'Internal media entered the build output.');

  if (outputFile.endsWith('.html') || outputFile.endsWith('.js') || outputFile.endsWith('.css')) {
    const outputText = await readFile(outputFile, 'utf8');
    assert.doesNotMatch(
      outputText,
      /particle-skin-ui-reference|git-lfs\.github\.com\/spec/iu,
      `Internal reference text entered ${outputFile}.`,
    );
  }
}

console.log(`Verified ${expectedHtmlFiles.length} generated pages and ${outputFiles.length} output files.`);
