export function initializeBrowserTab(documentRef: Document, windowRef: Window) {
  const icon = documentRef.querySelector<HTMLLinkElement>('[data-browser-tab-icon]');
  const lightSrc = icon?.dataset.lightIcon;
  const darkSrc = icon?.dataset.darkIcon;

  if (!icon || !lightSrc || !darkSrc || typeof windowRef.matchMedia !== 'function') {
    return { destroy: () => undefined };
  }

  // Follow browser/system appearance, independently of the page's manual theme toggle.
  const preference = windowRef.matchMedia('(prefers-color-scheme: dark)');
  const updateIcon = () => icon.setAttribute('href', preference.matches ? darkSrc : lightSrc);
  updateIcon();
  preference.addEventListener('change', updateIcon);

  return {
    destroy: () => preference.removeEventListener('change', updateIcon),
  };
}

