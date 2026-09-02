import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'framework', 'dist');
const pageSlugs = [
  'frc',
  'team',
  'events',
  'robots',
  'achievements',
  'news',
  'sponsors',
  'contact',
];
const automaticRoutes = ['', 'about-frc', ...pageSlugs];
const localizedRoutes = ['zh-cn', 'en'].flatMap((locale) => (
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

async function assertVersionedFavicon(html, relativePath, scheme) {
  const iconTag = [...html.matchAll(/<link rel="icon"[^>]+>/gu)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes('data-browser-tab-icon'));
  const reference = iconTag?.match(new RegExp(`data-${scheme}-icon="([^"]+)"`, 'u'))?.[1];

  assert.ok(reference?.startsWith('/content/'), `${relativePath} must provide a content-supplied ${scheme} favicon.`);
  const contents = await readFile(toOutputPath(reference));
  const expectedRevision = `${createHash('sha256').update(contents).digest('hex').slice(0, 12)}-${scheme}`;
  const actualRevision = new URL(reference, 'https://ghfrc.org/').searchParams.get('favicon');

  assert.equal(
    actualRevision,
    expectedRevision,
    `${relativePath} must version its ${scheme} favicon from the actual asset bytes.`,
  );
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

    if (!reference || seen.has(reference)) continue;

    seen.add(reference);
    const source = await readFile(toOutputPath(reference), 'utf8');
    scripts.push(source);

    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+\.js)["']/gu)) {
      const dependency = new URL(
        match[1],
        new URL(reference, 'https://ghfrc.org/'),
      ).pathname;

      if (dependency.startsWith('/')) pending.push(dependency);
    }
  }

  return scripts;
}

async function collectEventSlugs(locale) {
  const eventsDirectory = join(distRoot, locale, 'events');
  const entries = await readdir(eventsDirectory, { withFileTypes: true });
  const slugs = [];

  for (const entry of entries) {
    if (
      entry.isDirectory()
      && await fileExists(join(eventsDirectory, entry.name, 'index.html'))
    ) {
      slugs.push(entry.name);
    }
  }

  return slugs.sort((left, right) => left.localeCompare(right));
}

function findTagByClass(source, tagName, className, startAt = 0) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gu');
  tagPattern.lastIndex = startAt;

  for (const match of source.matchAll(tagPattern)) {
    const classMatch = match[0].match(/\bclass="([^"]*)"/u);
    const classes = classMatch?.[1].split(/\s+/u) ?? [];

    if (classes.includes(className)) {
      return match[0];
    }
  }

  return undefined;
}

function readAttribute(tag, attributeName) {
  return tag?.match(new RegExp(`\\b${attributeName}="([^"]*)"`, 'u'))?.[1];
}

function isRecognizedImage(image, outputPath) {
  const isPng = image.length >= 8
    && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = image.length >= 3
    && image[0] === 0xff
    && image[1] === 0xd8
    && image[2] === 0xff;
  const signature = image.subarray(0, 12).toString('ascii');
  const isGif = signature.startsWith('GIF87a') || signature.startsWith('GIF89a');
  const isWebp = signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP';
  const isAvif = image.length >= 12 && image.subarray(4, 12).toString('ascii') === 'ftypavif';
  const isSvg = extname(outputPath).toLowerCase() === '.svg'
    && /<svg(?:\s|>)/u.test(image.subarray(0, 4096).toString('utf8'));

  return isPng || isJpeg || isGif || isWebp || isAvif || isSvg;
}

for (const relativePath of expectedHtmlFiles) {
  assert.equal(
    await fileExists(join(distRoot, relativePath)),
    true,
    `Missing generated page: ${relativePath}`,
  );
}

const simplifiedChineseEventSlugs = await collectEventSlugs('zh-cn');
const englishEventSlugs = await collectEventSlugs('en');
assert.ok(
  simplifiedChineseEventSlugs.length > 0,
  'The generated site must include at least one published event.',
);
assert.deepEqual(
  englishEventSlugs,
  simplifiedChineseEventSlugs,
  'Published events must have matching Simplified Chinese and English routes.',
);
const eventSlugs = simplifiedChineseEventSlugs;
const eventHtmlFiles = eventSlugs.flatMap((eventSlug) => [
  `events/${eventSlug}/index.html`,
  `zh-cn/events/${eventSlug}/index.html`,
  `en/events/${eventSlug}/index.html`,
]);

for (const relativePath of eventHtmlFiles) {
  assert.equal(
    await fileExists(join(distRoot, relativePath)),
    true,
    `Missing generated event page: ${relativePath}`,
  );
}

const localizedEventRoutes = ['zh-cn', 'en'].flatMap((locale) => (
  eventSlugs.map((eventSlug) => `${locale}/events/${eventSlug}`)
));

for (const route of [...localizedRoutes, ...localizedEventRoutes]) {
  const relativePath = `${route}/index.html`;
  const html = await readFile(join(distRoot, relativePath), 'utf8');
  const locale = route.split('/')[0];
  const htmlLanguage = locale === 'en' ? 'en' : 'zh-CN';
  const pagePath = route.slice(locale.length + 1);
  const oppositeLocale = locale === 'en' ? 'zh-cn' : 'en';
  const expectedSwitchPath = `/${oppositeLocale}/${pagePath ? `${pagePath}/` : ''}`;

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
    await assertVersionedFavicon(html, relativePath, scheme);
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
  assert.match(
    html,
    new RegExp(`href="${expectedSwitchPath}"[^>]*data-language-switch`, 'u'),
    `${relativePath} must switch to the matching localized route.`,
  );
  assert.match(html, /hreflang="zh-CN"/u, `${relativePath} must advertise zh-CN.`);
  assert.match(html, /hreflang="en"/u, `${relativePath} must advertise English.`);
  assert.match(html, /hreflang="x-default"/u, `${relativePath} must advertise x-default.`);
  assert.doesNotMatch(html, /hreflang="zh-Hant"/u, 'Traditional Chinese must remain disabled.');

  if (locale === 'en') {
    assert.match(
      html,
      /<meta name="robots" content="noindex, follow">/u,
      `${relativePath} must remain noindex while English content is incomplete.`,
    );
  }

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

for (const eventSlug of eventSlugs) {
  const eventRedirectHtml = await readFile(
    join(distRoot, 'events', eventSlug, 'index.html'),
    'utf8',
  );
  assert.match(
    eventRedirectHtml,
    /__ghfrc_auto_language/u,
    `The ${eventSlug} entry must select a language.`,
  );
  assert.doesNotMatch(
    eventRedirectHtml,
    /data-site-header/u,
    `The ${eventSlug} entry must remain a redirect entry.`,
  );
  assert.match(
    eventRedirectHtml,
    /ghfrc-language/u,
    `The ${eventSlug} entry must respect the stored language preference.`,
  );
  assert.match(
    eventRedirectHtml,
    /navigator\.languages/u,
    `The ${eventSlug} entry must detect the browser language when no preference is stored.`,
  );
  assert.ok(
    eventRedirectHtml.includes(`href="/zh-cn/events/${eventSlug}/"`),
    `The ${eventSlug} entry must provide a Simplified Chinese fallback link.`,
  );
  assert.ok(
    eventRedirectHtml.includes(`href="/en/events/${eventSlug}/"`),
    `The ${eventSlug} entry must provide an English fallback link.`,
  );
  assert.match(
    eventRedirectHtml,
    /window\.location\.replace/u,
    `The ${eventSlug} entry must automatically redirect to its localized route.`,
  );
}

const eventImageReferences = new Set();
for (const locale of ['zh-cn', 'en']) {
  const homepageHtml = await readFile(join(distRoot, locale, 'index.html'), 'utf8');
  let previousRoutePosition = -1;

  for (const slug of pageSlugs) {
    const route = `/${locale}/${slug}/`;
    const routePosition = homepageHtml.indexOf(`href="${route}"`);
    assert.ok(routePosition > previousRoutePosition, `${locale} homepage order is incorrect at ${route}.`);
    previousRoutePosition = routePosition;
  }

  assert.match(
    homepageHtml,
    /class="home-event-hero"/u,
    `${locale} homepage must render the featured-event hero.`,
  );
  assert.match(
    homepageHtml,
    /data-featured-event=/u,
    `${locale} homepage must identify its featured event.`,
  );
  const featuredEventAction = findTagByClass(
    homepageHtml,
    'a',
    'home-event-hero__action',
  );
  const featuredEventHref = readAttribute(featuredEventAction, 'href');
  const featuredEventRoutePrefix = `/${locale}/events/`;
  assert.ok(
    featuredEventHref?.startsWith(featuredEventRoutePrefix)
      && featuredEventHref.endsWith('/'),
    `${locale} homepage featured event must link to a localized event detail page.`,
  );
  const featuredEventSlug = featuredEventHref.slice(
    featuredEventRoutePrefix.length,
    -1,
  );
  assert.ok(
    eventSlugs.includes(featuredEventSlug),
    `${locale} homepage featured event must link to a published event.`,
  );
  const featuredEventMediaPosition = homepageHtml.indexOf('class="home-event-hero__media"');
  const featuredEventImage = homepageHtml
    .slice(featuredEventMediaPosition)
    .match(/<img\b[^>]*>/u)?.[0];
  const featuredEventImageReference = readAttribute(featuredEventImage, 'src');
  assert.ok(
    featuredEventImageReference?.startsWith('/')
      && !featuredEventImageReference.startsWith('//'),
    `${locale} homepage featured event must use an internal image.`,
  );
  eventImageReferences.add(featuredEventImageReference);
  assert.doesNotMatch(
    homepageHtml,
    /data-achievement-section="events"/u,
    `${locale} homepage must not repeat Events as a regular showcase section.`,
  );

  const eventsHtml = await readFile(join(distRoot, locale, 'events', 'index.html'), 'utf8');
  assert.match(eventsHtml, /data-event-archive/u, `${locale} Events must render the archive.`);
  assert.match(eventsHtml, /data-event-card/u, `${locale} Events must render an event card.`);
  assert.match(
    eventsHtml,
    /data-event-starts-at=/u,
    `${locale} Events must expose the event start time for automatic status updates.`,
  );
  assert.match(
    eventsHtml,
    /data-event-ends-at=/u,
    `${locale} Events must expose the event end time for automatic archiving.`,
  );
  assert.match(
    eventsHtml,
    /data-event-list="upcoming"/u,
    `${locale} Events must provide an upcoming-events destination.`,
  );
  assert.match(
    eventsHtml,
    /data-event-list="past"/u,
    `${locale} Events must provide a historical-events destination.`,
  );
  assert.match(
    eventsHtml,
    /data-event-status-label/u,
    `${locale} Events must provide a status label that can be updated automatically.`,
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

  for (const eventSlug of eventSlugs) {
    assert.ok(
      eventsHtml.includes(`href="/${locale}/events/${eventSlug}/"`),
      `${locale} Events must link to the ${eventSlug} detail page.`,
    );

    const eventDetailHtml = await readFile(
      join(distRoot, locale, 'events', eventSlug, 'index.html'),
      'utf8',
    );
    assert.match(
      eventDetailHtml,
      /class="event-detail"/u,
      `${locale}/${eventSlug} must render the event-detail layout.`,
    );
    assert.match(
      eventDetailHtml,
      /class="event-detail__registration"/u,
      `${locale}/${eventSlug} must render public attendance information.`,
    );
    const eventBackdropImage = findTagByClass(
      eventDetailHtml,
      'img',
      'event-detail__backdrop',
    );
    assert.equal(
      readAttribute(eventBackdropImage, 'alt'),
      '',
      `${locale}/${eventSlug} decorative backdrop must have an empty alt attribute.`,
    );
    assert.equal(
      readAttribute(eventBackdropImage, 'aria-hidden'),
      'true',
      `${locale}/${eventSlug} decorative backdrop must be hidden from assistive technology.`,
    );
    const eventArtworkImage = findTagByClass(
      eventDetailHtml,
      'img',
      'event-detail__artwork',
    );
    const eventImageReference = readAttribute(eventArtworkImage, 'src');
    const eventImageAlt = readAttribute(eventArtworkImage, 'alt');
    const eventImageWidth = Number(readAttribute(eventArtworkImage, 'width'));
    const eventImageHeight = Number(readAttribute(eventArtworkImage, 'height'));
    assert.ok(
      eventImageReference?.startsWith('/') && !eventImageReference.startsWith('//'),
      `${locale}/${eventSlug} must use an internal event image.`,
    );
    assert.ok(
      eventImageAlt?.trim().length > 0,
      `${locale}/${eventSlug} event artwork must provide meaningful alternative text.`,
    );
    assert.equal(
      readAttribute(eventBackdropImage, 'src'),
      eventImageReference,
      `${locale}/${eventSlug} decorative backdrop must use the event artwork source.`,
    );
    assert.ok(
      Number.isInteger(eventImageWidth) && eventImageWidth > 0,
      `${locale}/${eventSlug} must declare a positive event image width.`,
    );
    assert.ok(
      Number.isInteger(eventImageHeight) && eventImageHeight > 0,
      `${locale}/${eventSlug} must declare a positive event image height.`,
    );
    eventImageReferences.add(eventImageReference);
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
  assert.match(robotsHtml, /class="empty-state"/u, 'Robots must show its formal empty state.');
  assert.doesNotMatch(
    robotsHtml,
    /class="site-page__hero/u,
    'Robots must not render the redundant page hero.',
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

  const newsHtml = await readFile(join(distRoot, locale, 'news', 'index.html'), 'utf8');
  assert.match(newsHtml, /class="empty-state"/u, 'News must retain its empty state.');
}

assert.equal(await fileExists(join(distRoot, 'zh-hant')), false, 'zh-Hant routes must not be generated.');

assert.ok(eventImageReferences.size > 0, 'Published events must include at least one image.');
for (const eventImageReference of eventImageReferences) {
  const eventImagePath = toOutputPath(eventImageReference);
  assert.equal(
    await fileExists(eventImagePath),
    true,
    `Missing generated event image: ${eventImageReference}`,
  );
  const eventImage = await readFile(eventImagePath);
  assert.ok(
    eventImage.length > 0 && isRecognizedImage(eventImage, eventImagePath),
    `Generated event image is empty or unsupported: ${eventImageReference}`,
  );
}

const outputFiles = await collectFiles(distRoot);
for (const outputFile of outputFiles) {
  assert.doesNotMatch(outputFile, /\.(?:lfs|mov)$/iu, 'Internal media entered the build output.');
  assert.doesNotMatch(
    outputFile,
    /(?:二维码|qrcode|qr[-_ ]?code|valid[-_ ]?until|expiry[-_ ]?date)/iu,
    'A hidden QR-code or expiry asset entered the build output.',
  );

  if (outputFile.endsWith('.html') || outputFile.endsWith('.js') || outputFile.endsWith('.css')) {
    const outputText = await readFile(outputFile, 'utf8');
    assert.doesNotMatch(
      outputText,
      /particle-skin-ui-reference|git-lfs\.github\.com\/spec/iu,
      `Internal reference text entered ${outputFile}.`,
    );
    assert.doesNotMatch(
      outputText,
      /(?:二维码|QR\s*code|qrcode|到期时间|有效期|valid\s+until|expiry\s+date)/iu,
      `Hidden QR-code or expiry information entered ${outputFile}.`,
    );
  }
}

console.log(
  `Verified ${expectedHtmlFiles.length + eventHtmlFiles.length} generated pages and `
  + `${outputFiles.length} output files.`,
);
