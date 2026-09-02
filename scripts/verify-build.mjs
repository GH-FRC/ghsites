import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'framework', 'dist');
const supportedLocales = ['zh-cn', 'zh-hant', 'en'];
const htmlLanguages = { 'zh-cn': 'zh-CN', 'zh-hant': 'zh-Hant', en: 'en' };
const pageSlugs = [
  'frc',
  'team',
  'robots',
  'sponsors',
  'contact',
];
const inactivePageSlugs = ['xplore', 'achievements', 'news'];


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

async function readScriptClosure(initialReferences) {
  const pending = [...initialReferences];
  const seen = new Set();
  const scripts = [];

  while (pending.length > 0) {
    const reference = pending.shift();

    if (!reference || seen.has(reference)) {
      continue;
    }

    seen.add(reference);
    const source = await readFile(toOutputPath(reference), 'utf8');
    scripts.push(source);

    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+\.js)["']/gu)) {
      const dependency = new URL(match[1], new URL(reference, 'https://ghfrc.org/')).pathname;

      if (dependency.startsWith('/')) {
        pending.push(dependency);
      }
    }
  }

  return scripts;
}

async function discoverGeneratedEventSlugs(locale) {
  const eventsDirectory = join(distRoot, locale, 'events');

  try {
    const entries = await readdir(eventsDirectory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function imageReferenceFrom(source, context) {
  const imageTag = source.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/u);

  assert.ok(imageTag, `${context} must contain an image.`);
  assert.match(imageTag[0], /\bwidth="[1-9]\d*"/u, `${context} image must declare its width.`);
  assert.match(imageTag[0], /\bheight="[1-9]\d*"/u, `${context} image must declare its height.`);

  return imageTag[1];
}

async function assertValidContentImage(publicReference, context) {
  const referenceUrl = new URL(publicReference, 'https://ghfrc.org/');

  assert.match(
    decodeURIComponent(referenceUrl.pathname),
    /^\/content\/images\//u,
    `${context} must use a staged content image.`,
  );

  const image = await readFile(toOutputPath(publicReference));
  const isPng = image.length >= 24
    && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && image.readUInt32BE(16) > 0
    && image.readUInt32BE(20) > 0;
  const isJpeg = image.length >= 4
    && image[0] === 0xff
    && image[1] === 0xd8
    && image.at(-2) === 0xff
    && image.at(-1) === 0xd9;
  const isWebp = image.length >= 16
    && image.toString('ascii', 0, 4) === 'RIFF'
    && image.toString('ascii', 8, 12) === 'WEBP';
  const gifHeader = image.toString('ascii', 0, 6);
  const isGif = image.length >= 10 && (gifHeader === 'GIF87a' || gifHeader === 'GIF89a');
  const isAvif = image.length >= 16
    && image.toString('ascii', 4, 8) === 'ftyp'
    && /^(?:avif|avis)$/u.test(image.toString('ascii', 8, 12));

  assert.ok(
    isPng || isJpeg || isWebp || isGif || isAvif,
    `${context} must reference a non-empty, recognized raster image.`,
  );
}

const generatedEventSlugsByLocale = Object.fromEntries(
  await Promise.all(supportedLocales.map(async (locale) => (
    [locale, await discoverGeneratedEventSlugs(locale)]
  ))),
);
const eventSlugs = generatedEventSlugsByLocale[supportedLocales[0]];

assert.ok(eventSlugs.length > 0, 'Stable must publish at least one event.');
for (const locale of supportedLocales.slice(1)) {
  assert.deepEqual(
    generatedEventSlugsByLocale[locale],
    eventSlugs,
    `${locale} must publish the same event routes as ${supportedLocales[0]}.`,
  );
}

const eventRoutes = ['events', ...eventSlugs.map((slug) => `events/${slug}`)];
const automaticRoutes = ['', 'about-frc', ...pageSlugs, ...eventRoutes];
const localizedRoutes = supportedLocales.flatMap((locale) => (
  ['', ...pageSlugs, ...eventRoutes].map((slug) => (
    [locale, slug].filter(Boolean).join('/')
  ))
));
const expectedHtmlFiles = [
  ...automaticRoutes.map((route) => route ? `${route}/index.html` : 'index.html'),
  ...localizedRoutes.map((route) => `${route}/index.html`),
];

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
  const expectedSwitchPaths = supportedLocales
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
  for (const scheme of ['light', 'dark']) {
    assert.ok(
      [...html.matchAll(/<link rel="icon"[^>]+>/gu)].some(([tag]) => (
        tag.includes('data-browser-tab-icon')
        && tag.includes(`data-${scheme}-icon="/content/`)
        && tag.includes(`favicon=20260831-${scheme}`)
      )),
      `${relativePath} must provide a cache-versioned, content-supplied ${scheme} favicon.`,
    );
  }
  assert.ok(
    [...html.matchAll(/<meta name="theme-color"[^>]+>/gu)].some(([tag]) => (
      tag.includes('data-browser-theme-color')
      && tag.includes('data-light-color="#ffffff"')
      && tag.includes('data-dark-color="#000000"')
    )),
    `${relativePath} must provide theme colors controlled with the effective page appearance.`,
  );
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
  const localizedRoute = route === 'about-frc' ? 'frc' : route;
  const normalizedLocalizedRoute = localizedRoute ? `${localizedRoute}/` : '';

  assert.match(html, /__ghfrc_auto_language/u, `${relativePath} must select a language.`);
  assert.match(
    html,
    /localStorage\.getItem\(["']ghfrc-language["']\)/u,
    `${relativePath} must honor the visitor's stored language choice.`,
  );
  assert.match(
    html,
    /navigator\.languages/u,
    `${relativePath} must fall back to the visitor's browser language.`,
  );
  assert.match(
    html,
    /location\.replace/u,
    `${relativePath} must automatically open the localized route.`,
  );
  for (const locale of supportedLocales) {
    assert.match(
      html,
      new RegExp(`href="/${locale}/${normalizedLocalizedRoute}"`, 'u'),
      `${relativePath} must provide a ${locale} fallback link to the matching route.`,
    );
  }
  assert.doesNotMatch(html, /data-site-header/u, `${relativePath} must remain a redirect entry.`);
}

for (const locale of supportedLocales) {

  const homepageHtml = await readFile(join(distRoot, locale, 'index.html'), 'utf8');
  let previousRoutePosition = -1;

  for (const slug of pageSlugs) {
    const route = `/${locale}/${slug}/`;
    const routePosition = homepageHtml.lastIndexOf(`href="${route}"`);
    assert.ok(routePosition > previousRoutePosition, `${locale} homepage order is incorrect at ${route}.`);
    previousRoutePosition = routePosition;
  }

  const desktopNavigation = homepageHtml.match(
    /<nav[^>]*class="site-header__navigation"[^>]*>[\s\S]*?<\/nav>/u,
  )?.[0];
  assert.ok(desktopNavigation, `${locale} homepage must include the desktop navigation.`);

  const expectedNavigationHrefs = [
    'https://www.firstinspires.org/programs/frc/',
    `/${locale}/team/`,
    `/${locale}/events/`,
    `/${locale}/robots/`,
    `/${locale}/sponsors/`,
    `/${locale}/contact/`,
  ];
  let previousNavigationPosition = -1;

  for (const href of expectedNavigationHrefs) {
    const navigationPosition = desktopNavigation.indexOf(`href="${href}"`);
    assert.ok(
      navigationPosition > previousNavigationPosition,
      `${locale} desktop navigation order is incorrect at ${href}.`,
    );
    previousNavigationPosition = navigationPosition;
  }

  const featuredEventHero = homepageHtml.match(
    /<section\b[^>]*class="home-event-hero"[^>]*>[\s\S]*?<\/section>/u,
  )?.[0];
  assert.ok(featuredEventHero, `${locale} homepage must use the current-event hero.`);
  const featuredEventLink = featuredEventHero.match(
    new RegExp(`href="/${locale}/events/([^"/]+)/"`, 'u'),
  );
  assert.ok(featuredEventLink, `${locale} homepage must link its featured event detail page.`);
  const featuredEventSlug = featuredEventLink[1];
  assert.ok(
    eventSlugs.includes(featuredEventSlug),
    `${locale} homepage must feature a generated event.`,
  );
  const featuredEventImage = imageReferenceFrom(
    featuredEventHero,
    `${locale} homepage featured event`,
  );
  await assertValidContentImage(featuredEventImage, `${locale} homepage featured event`);

  assert.match(
    homepageHtml,
    /class="home-event-hero"/u,
    `${locale} homepage must use the current-event hero.`,
  );
  assert.match(
    homepageHtml,
    /data-featured-event="[^"]+"/u,
    `${locale} homepage must identify the featured event.`,
  );
  assert.doesNotMatch(
    homepageHtml,
    /class="home-hero(?:\s|")/u,
    `${locale} homepage must not retain the superseded generic hero.`,
  );
  assert.doesNotMatch(
    homepageHtml,
    /<section[^>]+id="events"[^>]*data-scroll-section/u,
    `${locale} homepage must not repeat Events as a generic showcase section.`,
  );

  const eventsHtml = await readFile(join(distRoot, locale, 'events', 'index.html'), 'utf8');
  assert.match(eventsHtml, /data-event-archive/u, `${locale} Events must render the event archive.`);
  assert.match(
    eventsHtml,
    /data-event-section="upcoming"/u,
    `${locale} Events must retain the upcoming-events section.`,
  );
  assert.match(
    eventsHtml,
    /data-event-section="past"/u,
    `${locale} Events must retain the historical-events section.`,
  );
  const eventCards = [...eventsHtml.matchAll(
    /<article\b[^>]*\bdata-event-card(?:\s|>)[\s\S]*?<\/article>/gu,
  )].map((match) => match[0]);
  assert.equal(
    eventCards.length,
    eventSlugs.length,
    `${locale} Events must list every generated event exactly once.`,
  );

  const cardImageBySlug = new Map();
  const listedEventSlugs = [];

  for (const [index, cardHtml] of eventCards.entries()) {
    const detailLink = cardHtml.match(
      new RegExp(`href="/${locale}/events/([^"/]+)/"`, 'u'),
    );
    const startsAt = cardHtml.match(/data-event-starts-at="([^"]+)"/u)?.[1];
    const endsAt = cardHtml.match(/data-event-ends-at="([^"]+)"/u)?.[1];

    assert.ok(detailLink, `${locale} event card ${index + 1} must link to its detail page.`);
    assert.ok(startsAt, `${locale} event card ${index + 1} must expose its start time.`);
    assert.ok(endsAt, `${locale} event card ${index + 1} must expose its end time.`);
    assert.ok(
      Number.isFinite(Date.parse(startsAt)),
      `${locale} event card ${index + 1} must expose a valid start time.`,
    );
    assert.ok(
      Number.isFinite(Date.parse(endsAt)) && Date.parse(endsAt) > Date.parse(startsAt),
      `${locale} event card ${index + 1} must end after it starts.`,
    );
    assert.match(
      cardHtml,
      /data-event-status="(?:upcoming|ongoing|past)"/u,
      `${locale} event card ${index + 1} must expose its current status.`,
    );
    assert.match(
      cardHtml,
      /data-event-upcoming-label="[^"]+"/u,
      `${locale} event card ${index + 1} must provide its upcoming label.`,
    );
    assert.match(
      cardHtml,
      /data-event-ongoing-label="[^"]+"/u,
      `${locale} event card ${index + 1} must provide its ongoing label.`,
    );
    assert.match(
      cardHtml,
      /data-event-past-label="[^"]+"/u,
      `${locale} event card ${index + 1} must provide its past label.`,
    );

    const slug = detailLink[1];
    const cardImage = imageReferenceFrom(cardHtml, `${locale} event card ${slug}`);
    await assertValidContentImage(cardImage, `${locale} event card ${slug}`);
    listedEventSlugs.push(slug);
    cardImageBySlug.set(slug, cardImage);
  }

  assert.deepEqual(
    [...listedEventSlugs].sort(),
    eventSlugs,
    `${locale} Events must link every generated event exactly once.`,
  );

  const eventScriptReferences = [...eventsHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gu)]
    .map((match) => match[1])
    .filter((reference) => reference.startsWith('/'));
  const eventScripts = await readScriptClosure(eventScriptReferences);
  assert.ok(
    eventScripts.some((script) => (
      script.includes('data-event-archive')
      && script.includes('eventStartsAt')
      && script.includes('eventEndsAt')
    )),
    `${locale} Events must include the automatic upcoming/history organizer.`,
  );

  for (const slug of eventSlugs) {
    const eventDetailHtml = await readFile(
      join(distRoot, locale, 'events', slug, 'index.html'),
      'utf8',
    );
    const detailHero = eventDetailHtml.match(
      /<header\b[^>]*class="event-detail__hero"[^>]*>[\s\S]*?<\/header>/u,
    )?.[0];
    const registration = eventDetailHtml.match(
      /<aside\b[^>]*class="event-detail__registration"[^>]*>([\s\S]*?)<\/aside>/u,
    )?.[1];

    assert.ok(detailHero, `${locale} event ${slug} must render the designed detail hero.`);
    const detailImage = imageReferenceFrom(detailHero, `${locale} event detail ${slug}`);
    await assertValidContentImage(detailImage, `${locale} event detail ${slug}`);
    assert.equal(
      detailImage,
      cardImageBySlug.get(slug),
      `${locale} event ${slug} must use the same cover in its card and detail page.`,
    );
    assert.ok(registration, `${locale} event ${slug} must render its public attendance notice.`);
    assert.equal(
      countMatches(registration, /<p(?:\s|>)[\s\S]*?<\/p>/gu),
      2,
      `${locale} event ${slug} attendance notice must contain two public instructions.`,
    );
    assert.match(
      eventDetailHtml,
      /<article\b[^>]*class="event-detail__body site-page__prose"[^>]*>[\s\S]*?<h2(?:\s|>)/u,
      `${locale} event ${slug} must include its public event description.`,
    );
    assert.match(
      eventDetailHtml,
      new RegExp(`href="/${locale}/events/"`, 'u'),
      `${locale} event ${slug} must link back to the event archive.`,
    );
  }

  assert.equal(
    featuredEventImage,
    cardImageBySlug.get(featuredEventSlug),
    `${locale} homepage and Events must use the same featured-event cover.`,
  );

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
    assert.doesNotMatch(
      outputText,
      /(?:二维码|到期时间|有效期|valid[\s-]*until|\bQR(?:[\s-]*code)?\b|\bexpir(?:y|es)\b)/iu,
      `QR-code or expiry information entered ${outputFile}.`,
    );
  }
}

console.log(`Verified ${expectedHtmlFiles.length} generated pages and ${outputFiles.length} output files.`);
