export const FIRST_ROBOTICS_COMPETITION_URL =
  'https://www.firstinspires.org/programs/frc/';

export interface HomeNavigationItem {
  href: string;
  label: string;
  opensInNewTab: boolean;
}

export function createHomeNavigationItems<SectionId extends string>(
  sections: ReadonlyArray<{ id: SectionId }>,
  labels: Readonly<Record<SectionId, string>>,
): HomeNavigationItem[] {
  return sections.map(({ id }) => {
    const opensInNewTab = id === 'about-frc';

    return {
      href: opensInNewTab ? FIRST_ROBOTICS_COMPETITION_URL : `#${id}`,
      label: labels[id],
      opensInNewTab,
    };
  });
}
