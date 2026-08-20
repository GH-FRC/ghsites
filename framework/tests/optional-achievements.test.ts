import { describe, expect, it, vi } from 'vitest';

import { initializeOptionalAchievementSystem } from '../src/scripts/optional-achievements';

describe('optional achievement integration', () => {
  it('leaves the framework operational when the achievement module is absent', async () => {
    await expect(initializeOptionalAchievementSystem({})).resolves.toBe(false);
  });

  it('initializes the achievement module through the optional framework seam', async () => {
    const initializeAchievementSystem = vi.fn();
    const options = {
      notificationLanguage: 'en',
      notificationText: 'Achievement unlocked',
    };

    await expect(
      initializeOptionalAchievementSystem(
        {
          achievementModule: async () => ({ initializeAchievementSystem }),
        },
        options,
      ),
    ).resolves.toBe(true);
    expect(initializeAchievementSystem).toHaveBeenCalledOnce();
    expect(initializeAchievementSystem).toHaveBeenCalledWith(options);
  });

  it('does not break the framework when the optional module fails to load', async () => {
    await expect(
      initializeOptionalAchievementSystem({
        achievementModule: async () => {
          throw new Error('Optional module unavailable');
        },
      }),
    ).resolves.toBe(false);
  });
});
