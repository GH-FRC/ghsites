import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'framework', 'dist');
const pageSlugs = [
  'frc',
  'team',
  'robots',
  'sponsors',
  'contact',
];
const inactivePageSlugs = ['xplore', 'achievements', 'news'];
const locales = ['zh-cn', 'zh-hant', 'en'];
const htmlLanguages = { 'zh-cn': 'zh-CN', 'zh-hant': 'zh-Hant', en: 'en' };
const automaticRoutes = ['', 'about-frc', ...pageSlugs];
const localizedRoutes = locales.flatMap((locale) => (
  ['', ...pageSlugs].map((slug) => [locale, slug].filter(Boolean).join('/'))
));
const expectedHtmlFiles = [
  ...automaticRoutes.map((route) => route ? `${route}/index.html` : 'index.html'),
  ...localizedRoutes.map((route) => `${route}/index.html`),
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

for (const route of localizedRoutes) {
  const relativePath = `${route}/index.html`;
  const html = await readFile(join(distRoot, relativePath), 'utf8');
  const locale = route.split('/')[0];
  const htmlLanguage = htmlLanguages[locale];
  const pagePath = route.slice(locale.length + 1);
  const expectedSwitchPaths = locales
    .filter((candidate) => candidate !== locale)
    .map((candidate) => `/${candidate}/${pagePath ? `${pagePath}/` : ''}`);

  assert.equal(countMatches(html, /<title(?:\s|>)/gu), 1, `${relativePath} must have one title.`);
  assert.equal(
    countMatches(html, /<meta name="description" content="[^"]+"(?:\s[^>]*)?>/gu),
    1,
    `${relativePath} must have one description.`,
  );
  assert.match(
    html,
    new RegExp(`<html[^>]*lang="${htmlLanguage}"`, 'u'),
    `${relativePath} must declare ${htmlLanguage}.`,
  );
  assert.equal(countMatches(html, /<h1(?:\s|>)/gu), 1, `${relativePath} must have one h1.`);
  assert.match(html, /data-site-header/u, `${relativePath} must include the shared header.`);
  for (const [scheme, color] of [['light', '#ffffff'], ['dark', '#000000']]) {
    assert.ok(
      html.includes(`<meta name="theme-color" content="${color}" media="(prefers-color-scheme: ${scheme})">`),
      `${relativePath} must provide the ${scheme} browser theme color.`,
    );
    assert.ok(
      [...html.matchAll(/<link rel="icon"[^>]+>/gu)].some(([tag]) => (
        tag.includes('data-browser-tab-icon')
        && tag.includes(`data-${scheme}-icon="/content/`)
      )),
      `${relativePath} must provide a content-supplied ${scheme} favicon.`,
    );
  }
  assert.match(html, /data-language-switch/u, `${relativePath} must include language switching.`);
  for (const expectedSwitchPath of expectedSwitchPaths) {
    assert.match(
      html,
      new RegExp(`href="${expectedSwitchPath}"[^>]*data-language-switch`, 'u'),
      `${relativePath} must switch to ${expectedSwitchPath}.`,
    );
  }
  assert.match(html, /hreflang="zh-CN"/u, `${relativePath} must advertise zh-CN.`);
  assert.match(html, /hreflang="zh-Hant"/u, `${relativePath} must advertise zh-Hant.`);
  assert.match(html, /hreflang="en"/u, `${relativePath} must advertise English.`);
  assert.match(html, /hreflang="x-default"/u, `${relativePath} must advertise x-default.`);

  if (locale === 'en') {
    assert.doesNotMatch(
      html,
      /<meta name="robots" content="noindex, follow">/u,
      `${relativePath} must be indexable after the English translation is complete.`,
    );
  }

  assert.doesNotMatch(
    html,
    /(?:预留区|Image or video area|<div class="placeholder)/u,
    `${relativePath} must not expose draft placeholders.`,
  );

  const publicReferences = [...html.matchAll(/(?:href|src|data-light-icon|data-dark-icon)="([^"]+)"/gu)]
    .map((match) => match[1])
    .filter((reference) => reference.startsWith('/') && !reference.startsWith('//'));

  for (const reference of publicReferences) {
    assert.equal(
      await fileExists(toOutputPath(reference)),
      true,
      `${relativePath} contains a broken internal reference: ${reference}`,
    );
  }
}

for (const route of automaticRoutes) {
  const relativePath = route ? `${route}/index.html` : 'index.html';
  const html = await readFile(join(distRoot, relativePath), 'utf8');

  assert.match(html, /__ghfrc_auto_language/u, `${relativePath} must select a language.`);
  assert.doesNotMatch(html, /data-site-header/u, `${relativePath} must remain a redirect entry.`);
}

for (const locale of locales) {
  const homepageHtml = await readFile(join(distRoot, locale, 'index.html'), 'utf8');
  let previousRoutePosition = -1;

  for (const slug of pageSlugs) {
    const route = `/${locale}/${slug}/`;
    const routePosition = homepageHtml.lastIndexOf(`href="${route}"`);
    assert.ok(routePosition > previousRoutePosition, `${locale} homepage order is incorrect at ${route}.`);
    previousRoutePosition = routePosition;
  }

  const sponsorsHtml = await readFile(join(distRoot, locale, 'sponsors', 'index.html'), 'utf8');
  assert.match(sponsorsHtml, /class="empty-state"/u, 'Sponsors must retain its empty state.');
  assert.match(
    sponsorsHtml,
    new RegExp(`href="/${locale}/contact/"`, 'u'),
    'Sponsors must link its partnership action to Contact.',
  );
  assert.doesNotMatch(
    sponsorsHtml,
    /class="site-page__hero/u,
    'Sponsors must not render the redundant page hero.',
  );

  const robotsHtml = await readFile(join(distRoot, locale, 'robots', 'index.html'), 'utf8');
  assert.match(robotsHtml, /class="empty-state"/u, 'Robots must show a formal empty state.');
  assert.doesNotMatch(
    robotsHtml,
    /class="site-page__hero/u,
    'Robots must not render the redundant page hero.',
  );
  assert.doesNotMatch(
    robotsHtml,
    /<div class="placeholder/u,
    'Robots must not show a draft media placeholder.',
  );

  const contactHtml = await readFile(join(distRoot, locale, 'contact', 'index.html'), 'utf8');
  assert.match(contactHtml, /class="empty-state"/u, 'Contact must show its formal empty state.');
  assert.doesNotMatch(
    contactHtml,
    /class="site-page__hero/u,
    'Contact must not render the redundant page hero.',
  );
  assert.doesNotMatch(
    contactHtml,
    /预留区/u,
    'Contact must not show draft placeholder copy.',
  );

  for (const slug of inactivePageSlugs) {
    assert.equal(
      await fileExists(join(distRoot, locale, slug, 'index.html')),
      false,
      `${locale}/${slug} must remain unpublished in Stable.`,
    );
  }
}

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
