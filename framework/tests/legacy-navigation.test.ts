import { describe, expect, it, vi } from 'vitest';

import { redirectLegacySection } from '../src/scripts/legacy-navigation';

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
});
