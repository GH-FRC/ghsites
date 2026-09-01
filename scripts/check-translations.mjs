import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

import { resolveLocalizedContent } from '../framework/src/i18n/localized-content.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const pageIds = [
  'achievements',
  'contact',
  'frc',
  'news',
  'robots',
  'sponsors',
  'team',
];

async function readYamlEntry(filePath, entryName) {
  const document = parse(await readFile(filePath, 'utf8'));
  const entry = document?.[entryName];

  if (!entry || typeof entry !== 'object') {
    throw new Error(`Translation check failed: invalid entry in ${filePath}.`);
  }

  return entry;
}
function parseMarkdown(sourceText, filePath) {
  const frontmatter = sourceText.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);

  if (!frontmatter) {
    throw new Error(`Translation check failed: missing frontmatter in ${filePath}.`);
  }

  const data = parse(frontmatter[1]) ?? {};

  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Translation check failed: invalid frontmatter in ${filePath}.`);
  }

  return {
    data,
    body: sourceText.slice(frontmatter[0].length).trim(),
  };
}

async function readMarkdown(locale, pageId) {
  const filePath = join(contentRoot, 'pages', locale, `${pageId}.md`);
  return parseMarkdown(await readFile(filePath, 'utf8'), filePath);
}

async function eventIds(locale) {
  const directory = join(contentRoot, 'events', locale);

  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
      .map((entry) => entry.name.slice(0, -3))
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function readEventMarkdown(locale, eventId) {
  const filePath = join(contentRoot, 'events', locale, `${eventId}.md`);
  return parseMarkdown(await readFile(filePath, 'utf8'), filePath);
}

const [siteBase, siteEnglish] = await Promise.all([
  readYamlEntry(
    join(contentRoot, 'config', 'locales', 'zh-CN', 'site.yaml'),
    'site',
  ),
  readYamlEntry(
    join(contentRoot, 'config', 'locales', 'en', 'site.yaml'),
    'site',
  ),
]);
const missingTranslations = resolveLocalizedContent(
  siteBase,
  siteEnglish,
).missingTranslations.map((path) => `site.${path}`);

for (const pageId of pageIds) {
  const [base, english] = await Promise.all([
    readMarkdown('zh-CN', pageId),
    readMarkdown('en', pageId),
  ]);
  const result = resolveLocalizedContent(base.data, english.data);

  missingTranslations.push(
    ...result.missingTranslations.map((path) => `pages.${pageId}.${path}`),
  );

  if (base.body && !english.body) {
    missingTranslations.push(`pages.${pageId}.body`);
  }
}

const [simplifiedChineseEventIds, englishEventIds] = await Promise.all([
  eventIds('zh-CN'),
  eventIds('en'),
]);
const englishEventIdSet = new Set(englishEventIds);
const eventTranslationIssues = [];

for (const eventId of simplifiedChineseEventIds) {
  const simplifiedChineseEvent = await readEventMarkdown('zh-CN', eventId);

  if (!englishEventIdSet.has(eventId)) {
    missingTranslations.push(`events.${eventId}`);
    eventTranslationIssues.push(`events.${eventId}`);
    continue;
  }

  const englishEvent = await readEventMarkdown('en', eventId);
  const simplifiedChinesePublished = simplifiedChineseEvent.data.published !== false;
  const englishPublished = englishEvent.data.published !== false;

  if (simplifiedChinesePublished !== englishPublished) {
    missingTranslations.push(`events.${eventId}.published`);
    eventTranslationIssues.push(`events.${eventId}.published`);
  }

  if (simplifiedChinesePublished && !simplifiedChineseEvent.body) {
    missingTranslations.push(`events.${eventId}.zh-CN.body`);
    eventTranslationIssues.push(`events.${eventId}.zh-CN.body`);
  }

  if (simplifiedChinesePublished && !englishEvent.body) {
    missingTranslations.push(`events.${eventId}.body`);
    eventTranslationIssues.push(`events.${eventId}.body`);
  }
}

for (const eventId of englishEventIds) {
  if (!simplifiedChineseEventIds.includes(eventId)) {
    missingTranslations.push(`events.${eventId}.zh-CN`);
    eventTranslationIssues.push(`events.${eventId}.zh-CN`);
  }
}

if (missingTranslations.length === 0) {
  console.log('English translation check: complete. English pages may be indexed.');
} else {
  console.log(
    `English translation check: ${missingTranslations.length} field(s) still use Simplified Chinese fallback.`,
  );
  missingTranslations.forEach((path) => console.log(`- ${path}`));
  console.log('English pages remain noindex until this report is empty.');
}

if (eventTranslationIssues.length > 0) {
  console.error('Event translation check failed: every published event requires paired English and Simplified Chinese content with a body.');
  eventTranslationIssues.forEach((path) => console.error(`- ${path}`));
  process.exitCode = 1;
}
