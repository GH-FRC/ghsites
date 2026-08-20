import { describe, expect, it, vi } from 'vitest';

import {
  initializeLegacySectionNavigation,
  redirectLegacySection,
} from '../src/scripts/legacy-navigation';

describe('legacy homepage section navigation', () => {
  it('replaces a known section hash with its independent page route', () => {
    const replace = vi.fn();

    const redirected = redirectLegacySection({ hash: '#about-frc', replace });

    expect(redirected).toBe(true);
    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/frc/');
  });

  it('leaves an unknown hash unchanged', () => {
    const replace = vi.fn();

    const redirected = redirectLegacySection({ hash: '#unknown', replace });

    expect(redirected).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects when a known legacy hash is entered after the homepage has loaded', () => {
    const locationRef = { hash: '', replace: vi.fn() };
    const eventTarget = new EventTarget();

    const redirectedOnLoad = initializeLegacySectionNavigation(locationRef, eventTarget);
    locationRef.hash = '#about-frc';
    eventTarget.dispatchEvent(new Event('hashchange'));

    expect(redirectedOnLoad).toBe(false);
    expect(locationRef.replace).toHaveBeenCalledWith('/frc/');
  });
});
