interface AchievementModule {
  initializeAchievementSystem: () => unknown;
}

export type AchievementModuleLoaders = Record<
  string,
  () => Promise<AchievementModule>
>;

const achievementModuleLoaders = import.meta.glob<AchievementModule>(
  '../../../achievements/src/index.ts',
);

export async function initializeOptionalAchievementSystem(
  loaders: AchievementModuleLoaders = achievementModuleLoaders,
): Promise<boolean> {
  const loadModule = Object.values(loaders)[0];

  if (!loadModule) {
    return false;
  }

  try {
    const achievementModule = await loadModule();
    achievementModule.initializeAchievementSystem();
    return true;
  } catch {
    return false;
  }
}
