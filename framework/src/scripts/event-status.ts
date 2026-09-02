export type EventStatus = 'upcoming' | 'ongoing' | 'past';

type DateInput = Date | string | number;

function timestamp(value: DateInput) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function getEventStatus(
  startsAt: DateInput,
  endsAt: DateInput,
  now: DateInput = Date.now(),
): EventStatus {
  const start = timestamp(startsAt);
  const end = timestamp(endsAt);
  const current = timestamp(now);

  if (current < start) {
    return 'upcoming';
  }

  if (current <= end) {
    return 'ongoing';
  }

  return 'past';
}

function statusLabelKey(status: EventStatus) {
  return status === 'past' ? 'eventPastLabel' : status === 'ongoing'
    ? 'eventOngoingLabel'
    : 'eventUpcomingLabel';
}

function refreshStatus(container: HTMLElement) {
  const status = getEventStatus(
    container.dataset.eventStartsAt ?? '',
    container.dataset.eventEndsAt ?? '',
  );
  const statusLabel = container.querySelector<HTMLElement>('[data-event-status-label]');

  container.dataset.eventStatus = status;
  if (statusLabel) {
    statusLabel.textContent = container.dataset[statusLabelKey(status)] ?? '';
  }

  return status;
}

function sortEventCards(list: HTMLElement, direction: 'ascending' | 'descending') {
  const cards = [...list.querySelectorAll<HTMLElement>('[data-event-card]')];

  cards.sort((left, right) => {
    const leftStart = timestamp(left.dataset.eventStartsAt ?? '');
    const rightStart = timestamp(right.dataset.eventStartsAt ?? '');

    return direction === 'ascending' ? leftStart - rightStart : rightStart - leftStart;
  });

  for (const card of cards) {
    list.append(card);
  }
}

function scheduleNextBoundary(
  containers: HTMLElement[],
  refresh: () => void,
) {
  const now = Date.now();
  const boundaries = containers.flatMap((container) => {
    const start = timestamp(container.dataset.eventStartsAt ?? '');
    const end = timestamp(container.dataset.eventEndsAt ?? '');

    if (Number.isFinite(start) && start > now) {
      return [start];
    }

    if (Number.isFinite(end) && end >= now) {
      return [end + 1];
    }

    return [];
  });

  if (boundaries.length === 0) {
    return;
  }

  const nextBoundary = Math.min(...boundaries);
  const maximumDelay = 2_147_483_647;
  window.setTimeout(refresh, Math.min(Math.max(nextBoundary - now, 1), maximumDelay));
}

export function initializeEventStatusLabels(root: ParentNode = document) {
  const statusContainers = [...root.querySelectorAll<HTMLElement>('[data-event-status-container]')];

  for (const container of statusContainers) {
    refreshStatus(container);
  }

  scheduleNextBoundary(statusContainers, () => initializeEventStatusLabels(root));
}

export function initializeEventArchive(root: ParentNode = document) {
  const archive = root.querySelector<HTMLElement>('[data-event-archive]');

  if (!archive) {
    return;
  }

  const upcomingList = archive.querySelector<HTMLElement>('[data-event-list="upcoming"]');
  const pastList = archive.querySelector<HTMLElement>('[data-event-list="past"]');
  const upcomingSection = archive.querySelector<HTMLElement>('[data-event-section="upcoming"]');
  const pastSection = archive.querySelector<HTMLElement>('[data-event-section="past"]');

  if (!upcomingList || !pastList || !upcomingSection || !pastSection) {
    return;
  }

  const cards = [...archive.querySelectorAll<HTMLElement>('[data-event-card]')];

  for (const card of cards) {
    const status = refreshStatus(card);

    (status === 'past' ? pastList : upcomingList).append(card);
  }

  sortEventCards(upcomingList, 'ascending');
  sortEventCards(pastList, 'descending');

  upcomingSection.hidden = upcomingList.childElementCount === 0;
  pastSection.hidden = pastList.childElementCount === 0;
  scheduleNextBoundary(cards, () => initializeEventArchive(root));
}
