import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { resolveLocalizedContent } from '../framework/src/i18n/localized-content.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');
const pageIds = ['achievements', 'contact', 'frc', 'news', 'robots', 'sponsors', 'team'];
const localeChecks = [
  { directory: 'en', label: 'English', requiredComplete: false },
  { directory: 'zh-Hant', label: 'Traditional Chinese', requiredComplete: true },
];

async function readSite(locale) {
  const filePath = join(contentRoot, 'config', 'locales', locale, 'site.yaml');
  const entry = parse(await readFile(filePath, 'utf8'))?.site;
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Translation check failed: invalid entry in ${filePath}.`);
  }
  return entry;
}

async function readMarkdown(collection, locale, id) {
  const filePath = join(contentRoot, collection, locale, `${id}.md`);
  const source = await readFile(filePath, 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!frontmatter) {
    throw new Error(`Translation check failed: missing frontmatter in ${filePath}.`);
  }
  const data = parse(frontmatter[1]) ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Translation check failed: invalid frontmatter in ${filePath}.`);
  }
  return { data, body: source.slice(frontmatter[0].length).trim() };
}

async function eventIds(locale) {
  try {
    return (await readdir(join(contentRoot, 'events', locale), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
      .map((entry) => entry.name.slice(0, -3))
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

const siteBase = await readSite('zh-CN');
const baseEventIds = await eventIds('zh-CN');
for (const localeCheck of localeChecks) {
  const siteOverlay = await readSite(localeCheck.directory);
  const missingTranslations = resolveLocalizedContent(siteBase, siteOverlay)
    .missingTranslations.map((path) => `site.${path}`);
  for (const pageId of pageIds) {
    const [base, overlay] = await Promise.all([
      readMarkdown('pages', 'zh-CN', pageId),
      readMarkdown('pages', localeCheck.directory, pageId),
    ]);
    missingTranslations.push(...resolveLocalizedContent(base.data, overlay.data)
      .missingTranslations.map((path) => `pages.${pageId}.${path}`));
    if (base.body && !overlay.body) missingTranslations.push(`pages.${pageId}.body`);
  }

  const localizedEventIds = await eventIds(localeCheck.directory);
  const eventIssues = [];
  for (const id of new Set([...baseEventIds, ...localizedEventIds])) {
    if (!baseEventIds.includes(id) || !localizedEventIds.includes(id)) {
      eventIssues.push(`events.${id}: missing paired locale file`);
      continue;
    }
    const [base, localized] = await Promise.all([
      readMarkdown('events', 'zh-CN', id),
      readMarkdown('events', localeCheck.directory, id),
    ]);
    const published = base.data.published !== false;
    if (published !== (localized.data.published !== false)) {
      eventIssues.push(`events.${id}.published`);
    }
    if (published && (!base.body || !localized.body)) {
      eventIssues.push(`events.${id}.body`);
    }
  }

  if (missingTranslations.length === 0) {
    console.log(`${localeCheck.label} translation check: complete.`);
  } else {
    console.log(`${localeCheck.label} translation check: ${missingTranslations.length} field(s) still use Simplified Chinese fallback.`);
    missingTranslations.forEach((path) => console.log(`- ${path}`));
    if (localeCheck.requiredComplete) process.exitCode = 1;
    else console.log('English pages remain noindex until this report is empty.');
  }
  if (eventIssues.length > 0) {
    console.error(`${localeCheck.label} event translation check failed: published events require paired files and complete bodies.`);
    eventIssues.forEach((path) => console.error(`- ${path}`));
    process.exitCode = 1;
  }
}
