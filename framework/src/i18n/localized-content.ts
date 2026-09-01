export type LocalizedContentOverlay<T> = T extends readonly (infer Item)[]
  ? readonly (Item extends { id: infer Id }
      ? { id: Id } & {
          [Key in Exclude<keyof Item, 'id'>]?: LocalizedContentOverlay<
            Item[Key]
          >;
        }
      : LocalizedContentOverlay<Item>)[]
  : T extends object
    ? { [Key in keyof T]?: LocalizedContentOverlay<T[Key]> }
    : T;

export interface LocalizedContentResolution<T> {
  content: T;
  missingTranslations: readonly string[];
  fallbackPaths: ReadonlySet<string>;
  isComplete: boolean;
}

const NON_TRANSLATABLE_CONTENT_KEYS: ReadonlySet<string> = new Set([
  'language',
  'id',
  'src',
  'intrinsicWidth',
  'intrinsicHeight',
  'url',
  'website',
  'href',
  'surface',
  'index',
  'kind',
  'srclang',
  'type',
  'poster',
  'navigationId',
  'order',
  'layout',
  'entryType',
  'published',
  'publishedAt',
  'default',
  'showPlaceholder',
  'featuredEventId',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type LocalizedMediaType = 'image' | 'video';

const LOCALIZED_MEDIA_KEYS: Record<LocalizedMediaType, ReadonlySet<string>> = {
  image: new Set([
    'type',
    'src',
    'alt',
    'intrinsicWidth',
    'intrinsicHeight',
  ]),
  video: new Set([
    'type',
    'src',
    'alt',
    'intrinsicWidth',
    'intrinsicHeight',
    'poster',
    'captions',
  ]),
};

function getLocalizedMediaType(value: unknown): LocalizedMediaType | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return value.type === 'image' || value.type === 'video'
    ? value.type
    : undefined;
}

function hasStableId(value: unknown): value is Record<string, unknown> & {
  id: string | number;
} {
  return (
    isRecord(value) &&
    (typeof value.id === 'string' || typeof value.id === 'number')
  );
}

function childPath(parentPath: string, key: string) {
  return parentPath ? `${parentPath}.${key}` : key;
}

function mergeValue(
  base: unknown,
  overlay: unknown,
  path: string,
  fallbackPaths: Set<string>,
  fieldName?: string,
): unknown {
  const overlayMediaType = getLocalizedMediaType(overlay);

  if (fieldName === 'media' && overlayMediaType) {
    const baseMediaType = getLocalizedMediaType(base);

    if (baseMediaType !== overlayMediaType) {
      return overlay;
    }

    const baseRecord = base as Record<string, unknown>;
    const overlayRecord = overlay as Record<string, unknown>;
    const unknownKey = Object.keys(overlayRecord).find(
      (key) => !LOCALIZED_MEDIA_KEYS[overlayMediaType].has(key),
    );

    if (unknownKey) {
      throw new Error(
        `Translation overlay at "${path}" contains unknown field "${unknownKey}".`,
      );
    }

    const keys = new Set([
      ...Object.keys(baseRecord),
      ...Object.keys(overlayRecord),
    ]);

    return Object.fromEntries(
      [...keys].map((key) => [
        key,
        mergeValue(
          baseRecord[key],
          overlayRecord[key],
          childPath(path, key),
          fallbackPaths,
          key,
        ),
      ]),
    );
  }

  if (typeof base === 'string') {
    if (typeof overlay === 'string' && overlay.trim().length > 0) {
      return overlay;
    }

    if (
      base.trim().length > 0 &&
      !NON_TRANSLATABLE_CONTENT_KEYS.has(fieldName ?? '')
    ) {
      fallbackPaths.add(path);
    }
    return base;
  }

  if (Array.isArray(base)) {
    const overlayItems = Array.isArray(overlay) ? overlay : [];

    if (base.every(hasStableId)) {
      const seenBaseIds = new Set<string | number>();
      const baseItemWithDuplicateId = base.find((item) => {
        if (seenBaseIds.has(item.id)) {
          return true;
        }

        seenBaseIds.add(item.id);
        return false;
      });

      if (baseItemWithDuplicateId) {
        throw new Error(
          `Base content at "${path}" contains duplicate id "${baseItemWithDuplicateId.id}".`,
        );
      }

      const itemWithoutId = overlayItems.findIndex((item) => !hasStableId(item));
      if (itemWithoutId >= 0) {
        throw new Error(
          `Translation overlay item at "${path}[${itemWithoutId}]" must include a stable id.`,
        );
      }

      const seenIds = new Set<string | number>();
      for (const item of overlayItems) {
        if (seenIds.has(item.id)) {
          throw new Error(
            `Translation overlay at "${path}" contains duplicate id "${item.id}".`,
          );
        }
        seenIds.add(item.id);
      }

      const baseIds = new Set(base.map((item) => item.id));
      const itemWithUnknownId = overlayItems.find((item) => !baseIds.has(item.id));
      if (itemWithUnknownId) {
        throw new Error(
          `Translation overlay at "${path}" contains unknown id "${itemWithUnknownId.id}".`,
        );
      }

      const overlaysById = new Map(
        overlayItems.map((item) => [item.id, item]),
      );

      return base.map((item) =>
        mergeValue(
          item,
          overlaysById.get(item.id),
          `${path}[id=${item.id}]`,
          fallbackPaths,
        ),
      );
    }

    return base.map((item, index) =>
      mergeValue(
        item,
        overlayItems[index],
        `${path}[${index}]`,
        fallbackPaths,
      ),
    );
  }

  if (isRecord(base)) {
    const overlayRecord = isRecord(overlay) ? overlay : {};
    const overlayOnlyEntries = Object.entries(overlayRecord).filter(
      ([key]) => !Object.hasOwn(base, key),
    );
    const unknownEntry = overlayOnlyEntries.find(
      ([key, value]) => key !== 'media' || !getLocalizedMediaType(value),
    );

    if (unknownEntry) {
      throw new Error(
        `Translation overlay at "${path || '<root>'}" contains unknown field "${unknownEntry[0]}".`,
      );
    }

    return Object.fromEntries(
      [
        ...Object.entries(base).map(([key, value]) => [
          key,
          mergeValue(
            value,
            overlayRecord[key],
            childPath(path, key),
            fallbackPaths,
            key,
          ),
        ]),
        ...overlayOnlyEntries.map(([key, value]) => [
          key,
          mergeValue(
            undefined,
            value,
            childPath(path, key),
            fallbackPaths,
            key,
          ),
        ]),
      ],
    );
  }

  return overlay ?? base;
}

export function resolveLocalizedContent<T>(
  base: T,
  overlay: LocalizedContentOverlay<T> | undefined,
): LocalizedContentResolution<T> {
  const fallbackPaths = new Set<string>();
  const content = mergeValue(base, overlay, '', fallbackPaths) as T;

  return {
    content,
    missingTranslations: [...fallbackPaths],
    fallbackPaths,
    isComplete: fallbackPaths.size === 0,
  };
}
