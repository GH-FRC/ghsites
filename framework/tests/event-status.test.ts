import { beforeEach, describe, expect, it } from 'vitest';

import {
  getEventStatus,
  initializeEventArchive,
  initializeEventStatusLabels,
} from '../src/scripts/event-status';

describe('event status', () => {
  it('distinguishes upcoming, ongoing, and past events at their exact boundaries', () => {
    const startsAt = '2030-01-10T10:00:00+08:00';
    const endsAt = '2030-01-10T11:00:00+08:00';

    expect(getEventStatus(startsAt, endsAt, '2030-01-10T09:59:59+08:00')).toBe('upcoming');
    expect(getEventStatus(startsAt, endsAt, startsAt)).toBe('ongoing');
    expect(getEventStatus(startsAt, endsAt, endsAt)).toBe('ongoing');
    expect(getEventStatus(startsAt, endsAt, '2030-01-10T11:00:01+08:00')).toBe('past');
  });
});

describe('event archive', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main data-event-archive>
        <section data-event-section="upcoming">
          <div data-event-list="upcoming"></div>
        </section>
        <section data-event-section="past" hidden>
          <div data-event-list="past"></div>
        </section>
        <article
          data-event-card
          data-event-starts-at="2020-01-01T09:00:00Z"
          data-event-ends-at="2020-01-01T10:00:00Z"
          data-event-upcoming-label="Upcoming"
          data-event-ongoing-label="Now"
          data-event-past-label="Past"
        >
          <span data-event-status-label></span>
        </article>
      </main>
    `;
  });

  it('moves an expired event into the visible history section', () => {
    initializeEventArchive();

    const pastList = document.querySelector('[data-event-list="past"]');
    const pastSection = document.querySelector<HTMLElement>('[data-event-section="past"]');
    const upcomingSection = document.querySelector<HTMLElement>('[data-event-section="upcoming"]');

    expect(pastList?.querySelector('[data-event-card]')).not.toBeNull();
    expect(pastSection?.hidden).toBe(false);
    expect(upcomingSection?.hidden).toBe(true);
    expect(document.querySelector('[data-event-status-label]')?.textContent).toBe('Past');
  });

  it('keeps archived events ordered from newest to oldest after moving cards', () => {
    document.body.innerHTML = '<main data-event-archive><section data-event-section="upcoming"><div data-event-list="upcoming"><article id="newer" data-event-card data-event-starts-at="2025-01-01T09:00:00Z" data-event-ends-at="2025-01-01T10:00:00Z" data-event-upcoming-label="Upcoming" data-event-ongoing-label="Now" data-event-past-label="Past"></article></div></section><section data-event-section="past"><div data-event-list="past"><article id="older" data-event-card data-event-starts-at="2024-01-01T09:00:00Z" data-event-ends-at="2024-01-01T10:00:00Z" data-event-upcoming-label="Upcoming" data-event-ongoing-label="Now" data-event-past-label="Past"></article></div></section></main>';

    initializeEventArchive();

    const ids = [...document.querySelectorAll('[data-event-list="past"] [data-event-card]')]
      .map((card) => card.id);
    expect(ids).toEqual(['newer', 'older']);
  });
});

describe('event status labels', () => {
  it('updates a rendered status label from its timestamps', () => {
    document.body.innerHTML = '<header data-event-status-container data-event-starts-at="2020-01-01T09:00:00Z" data-event-ends-at="2020-01-01T10:00:00Z" data-event-upcoming-label="Upcoming" data-event-ongoing-label="Now" data-event-past-label="Past"><span data-event-status-label>Upcoming</span></header>';

    initializeEventStatusLabels();

    expect(document.querySelector('[data-event-status-label]')?.textContent).toBe('Past');
  });
});
