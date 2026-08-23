import { describe, expect, it } from 'vitest';

import {
  FIRST_ROBOTICS_COMPETITION_URL,
  createHomeNavigationItems,
} from '../src/navigation';

describe('home navigation', () => {
  it('opens only About FRC on the official FIRST® Robotics Competition website in a new tab', () => {
    const items = createHomeNavigationItems(
      [
        { id: 'about-frc' },
        { id: 'about-xplore' },
        { id: 'about-gh-frc' },
      ] as const,
      {
        'about-frc': '关于 FRC',
        'about-xplore': '关于 X.PLORE',
        'about-gh-frc': '关于 GHFRC',
      },
    );

    expect(items).toEqual([
      {
        href: FIRST_ROBOTICS_COMPETITION_URL,
        label: '关于 FRC',
        opensInNewTab: true,
      },
      {
        href: '#about-xplore',
        label: '关于 X.PLORE',
        opensInNewTab: false,
      },
      {
        href: '#about-gh-frc',
        label: '关于 GHFRC',
        opensInNewTab: false,
      },
    ]);
  });
});
