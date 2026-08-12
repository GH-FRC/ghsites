export const COLOR_SCHEME_STORAGE_KEY = 'ghfrc-color-scheme';

type ColorScheme = 'dark' | 'light';

interface ColorSchemeControlHandle {
  destroy: () => void;
}

function isColorScheme(value: string | undefined): value is ColorScheme {
  return value === 'dark' || value === 'light';
}

export function createColorSchemeBootstrapScript(
  storageKey = COLOR_SCHEME_STORAGE_KEY,
): string {
  const serializedStorageKey = JSON.stringify(storageKey);

  return `(function () {
    try {
      var storedColorScheme = window.sessionStorage.getItem(${serializedStorageKey});

      if (storedColorScheme === 'dark' || storedColorScheme === 'light') {
        document.documentElement.dataset.colorScheme = storedColorScheme;
      } else {
        delete document.documentElement.dataset.colorScheme;

        if (storedColorScheme !== null) {
          window.sessionStorage.removeItem(${serializedStorageKey});
        }
      }
    } catch (error) {
      delete document.documentElement.dataset.colorScheme;
    }
  })();`;
}

export const COLOR_SCHEME_BOOTSTRAP_SCRIPT = createColorSchemeBootstrapScript();

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
