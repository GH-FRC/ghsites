export const COLOR_SCHEME_STORAGE_KEY = 'ghfrc-color-scheme';

type ColorScheme = 'dark' | 'light';

interface ColorSchemeControlHandle {
  destroy: () => void;
}

function isColorScheme(value: string | undefined): value is ColorScheme {
  return value === 'dark' || value === 'light';
}

export function initializeColorSchemeControl(
  documentRef: Document,
  windowRef: Window & typeof globalThis,
): ColorSchemeControlHandle {
  const toggle = documentRef.querySelector<HTMLButtonElement>('[data-color-scheme-toggle]');

  if (!toggle) {
    return { destroy: () => undefined };
  }

  const darkPreference = windowRef.matchMedia('(prefers-color-scheme: dark)');
  const switchToDarkLabel = toggle.dataset.switchToDarkLabel;
  const switchToLightLabel = toggle.dataset.switchToLightLabel;

  if (!switchToDarkLabel || !switchToLightLabel) {
    return { destroy: () => undefined };
  }

  const getStoredColorScheme = (): ColorScheme | undefined => {
    try {
      const storedColorScheme = windowRef.sessionStorage.getItem(COLOR_SCHEME_STORAGE_KEY);

      if (storedColorScheme === null || !isColorScheme(storedColorScheme)) {
        return undefined;
      }

      return storedColorScheme;
    } catch {
      return undefined;
    }
  };

  const applyStoredColorScheme = () => {
    const storedColorScheme = getStoredColorScheme();

    if (storedColorScheme) {
      documentRef.documentElement.dataset.colorScheme = storedColorScheme;
    } else {
      delete documentRef.documentElement.dataset.colorScheme;
    }
  };

  const getActiveColorScheme = (): ColorScheme => {
    const manualColorScheme = documentRef.documentElement.dataset.colorScheme;

    if (isColorScheme(manualColorScheme)) {
      return manualColorScheme;
    }

    return darkPreference.matches ? 'dark' : 'light';
  };

  const updateToggle = () => {
    const activeColorScheme = getActiveColorScheme();
    const nextLabel = activeColorScheme === 'dark' ? switchToLightLabel : switchToDarkLabel;

    toggle.setAttribute('aria-label', nextLabel);
    toggle.title = nextLabel;
  };

  applyStoredColorScheme();
  updateToggle();

  const handleToggle = () => {
    const nextColorScheme: ColorScheme = getActiveColorScheme() === 'dark' ? 'light' : 'dark';
    documentRef.documentElement.dataset.colorScheme = nextColorScheme;

    try {
      windowRef.sessionStorage.setItem(COLOR_SCHEME_STORAGE_KEY, nextColorScheme);
    } catch {
      // The selected mode still applies to the current document when storage is unavailable.
    }

    updateToggle();
  };

  const handleSystemPreferenceChange = () => {
    if (!isColorScheme(documentRef.documentElement.dataset.colorScheme)) {
      updateToggle();
    }
  };

  toggle.addEventListener('click', handleToggle);
  darkPreference.addEventListener('change', handleSystemPreferenceChange);

  return {
    destroy: () => {
      toggle.removeEventListener('click', handleToggle);
      darkPreference.removeEventListener('change', handleSystemPreferenceChange);
    },
  };
}
