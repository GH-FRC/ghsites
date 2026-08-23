import { readFile } from 'node:fs/promises';
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
  'xplore',
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

if (missingTranslations.length === 0) {
  console.log('English translation check: complete. English pages may be indexed.');
} else {
  console.log(
    `English translation check: ${missingTranslations.length} field(s) still use Simplified Chinese fallback.`,
  );
  missingTranslations.forEach((path) => console.log(`- ${path}`));
  console.log('English pages remain noindex until this report is empty.');
}
