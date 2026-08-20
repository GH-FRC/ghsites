import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

import { resolveLocalizedContent } from '../framework/src/i18n/localized-content.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = process.env.GH_FRC_CONTENT_DIR
  ? resolve(projectRoot, process.env.GH_FRC_CONTENT_DIR)
  : join(projectRoot, 'content');

const localizedContentFiles = [
  { id: 'site', fileName: 'site.yaml', entryName: 'site' },
  { id: 'aboutFrc', fileName: 'about-frc.yaml', entryName: 'aboutFrc' },
];

async function readLocalizedEntry(locale, definition) {
  const filePath = join(
    contentRoot,
    'config',
    'locales',
    locale,
    definition.fileName,
  );
  const document = parse(await readFile(filePath, 'utf8'));
  return document?.[definition.entryName];
}

const reports = await Promise.all(localizedContentFiles.map(async (definition) => {
  const [base, english] = await Promise.all([
    readLocalizedEntry('zh-CN', definition),
    readLocalizedEntry('en', definition),
  ]);

  if (!base || typeof base !== 'object' || !english || typeof english !== 'object') {
    throw new Error(`Translation check failed: ${definition.id} locale entries are invalid.`);
  }

  const result = resolveLocalizedContent(base, english);
  return result.missingTranslations.map((path) => `${definition.id}.${path}`);
}));

const missingTranslations = reports.flat();

if (missingTranslations.length === 0) {
  console.log('English translation check: complete. English pages may be indexed.');
} else {
  console.log(
    `English translation check: ${missingTranslations.length} field(s) still use Simplified Chinese fallback.`,
  );
  missingTranslations.forEach((path) => console.log(`- ${path}`));
  console.log('English pages remain noindex until this report is empty.');
}
