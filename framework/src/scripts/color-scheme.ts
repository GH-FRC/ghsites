type ColorScheme = 'dark' | 'light';

interface ColorSchemeControlHandle {
  destroy: () => void;
}

function isColorScheme(value: string | undefined): value is ColorScheme {
  return value === 'dark' || value === 'light';
}

export function createColorSchemeBootstrapScript(): string {
  return `(function () {
    delete document.documentElement.dataset.colorScheme;
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
