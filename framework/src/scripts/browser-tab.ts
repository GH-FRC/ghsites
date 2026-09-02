export function initializeBrowserTab(documentRef: Document, windowRef: Window) {
  const icon = documentRef.querySelector<HTMLLinkElement>('[data-browser-tab-icon]');
  const themeColor = documentRef.querySelector<HTMLMetaElement>('[data-browser-theme-color]');
  const lightSrc = icon?.dataset.lightIcon;
  const darkSrc = icon?.dataset.darkIcon;
  const lightColor = themeColor?.dataset.lightColor;
  const darkColor = themeColor?.dataset.darkColor;

  if (
    !icon
    || !themeColor
    || !lightSrc
    || !darkSrc
    || !lightColor
    || !darkColor
    || typeof windowRef.matchMedia !== 'function'
  ) {
    return { destroy: () => undefined };
  }

  const preference = windowRef.matchMedia('(prefers-color-scheme: dark)');
  const updateAppearance = () => {
    const manualScheme = documentRef.documentElement.dataset.colorScheme;
    const usesDarkAppearance = manualScheme === 'dark'
      || (manualScheme !== 'light' && preference.matches);

    icon.setAttribute('href', usesDarkAppearance ? darkSrc : lightSrc);
    themeColor.setAttribute('content', usesDarkAppearance ? darkColor : lightColor);
  };
  const observer = new MutationObserver(updateAppearance);

  updateAppearance();
  preference.addEventListener('change', updateAppearance);
  observer.observe(documentRef.documentElement, {
    attributes: true,
    attributeFilter: ['data-color-scheme'],
  });

  return {
    destroy: () => {
      preference.removeEventListener('change', updateAppearance);
      observer.disconnect();
    },
  };
}
