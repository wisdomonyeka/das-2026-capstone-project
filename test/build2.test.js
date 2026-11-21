import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTier, bookTickets, createEvent, createStore, listEventSummaries, publishEvent,
  seatsLeft, unpublishEvent,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';
import { filterEvents, searchEvents, sortEvents } from '../src/domain/eventSearch.js';
import { mergeSort } from '../src/domain/sorting.js';

function errorCode(action, code) {
  assert.throws(action, (error) => error instanceof DomainError && error.code === code);
}

function publishedStore() {
  const store = createStore();
  const event = createEvent(store, {
    title: 'Lagos Tech Meetup', city: 'Lagos', venue: 'Civic Hall', startsAt: '2026-12-05T17:00:00.000Z',
  });
  const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 3 });
  publishEvent(store, event.id);
  return { store, event, tier };
}

describe('Build 2 inventory criteria', () => {
  it('S02 creates a draft with an id and hides it from the public list', () => {
    const store = createStore();
    const event = createEvent(store, { title: 'Show', city: 'Lagos', venue: 'Hall', startsAt: '2026-12-05' });
    assert.match(event.id, /^[0-9a-f-]{36}$/);
    assert.equal(event.status, 'draft');
    assert.deepEqual(listEventSummaries(store), []);
  });

  it('S02 rejects missing title/city and invalid dates without saving', () => {
    const store = createStore();
    errorCode(() => createEvent(store, { title: '', city: 'Lagos', startsAt: '2026-12-05' }), 'VALIDATION');
    errorCode(() => createEvent(store, { title: 'Show', city: '', startsAt: '2026-12-05' }), 'VALIDATION');
    errorCode(() => createEvent(store, { title: 'Show', city: 'Lagos', startsAt: 'not-a-date' }), 'VALIDATION');
    assert.equal(store.events.size, 0);
  });

  it('S03 saves a tier with zero sold and the full capacity available', () => {
    const { store, event } = publishedStore();
    const tier = [...store.tiers.values()][0];
    assert.equal(tier.sold, 0);
    assert.equal(seatsLeft(tier), 3);
    assert.equal(event.tierIds.length, 1);
  });

  it('S03 rejects non-whole prices and capacities below one', () => {
    const store = createStore();
    const event = createEvent(store, { title: 'Show', city: 'Lagos', startsAt: '2026-12-05' });
    errorCode(() => addTier(store, event.id, { name: 'A', priceCents: 1.5, capacity: 1 }), 'VALIDATION');
    errorCode(() => addTier(store, event.id, { name: 'A', priceCents: 1, capacity: 0 }), 'VALIDATION');
  });

  it('S03 rejects an unknown event', () => {
    errorCode(() => addTier(createStore(), 'missing', { name: 'A', priceCents: 1, capacity: 1 }), 'NOT_FOUND');
  });

  it('S04 publishes tiered events, rejects empty events, and unpublishes them', () => {
    const store = createStore();
    const empty = createEvent(store, { title: 'Empty', city: 'Lagos', startsAt: '2026-12-05' });
    errorCode(() => publishEvent(store, empty.id), 'INVALID_STATE');
    const event = createEvent(store, { title: 'Show', city: 'Lagos', startsAt: '2026-12-05' });
    addTier(store, event.id, { name: 'A', priceCents: 1, capacity: 1 });
    publishEvent(store, event.id);
    assert.equal(listEventSummaries(store).length, 1);
    unpublishEvent(store, event.id);
    assert.equal(listEventSummaries(store).length, 0);
  });

  it('S06 books pending tickets at whole-cent price and leaves seats', () => {
    const { store, tier } = publishedStore();
    const booking = bookTickets(store, tier.id, 'user-1', 2);
    assert.equal(booking.status, 'pending');
    assert.equal(booking.amountCents, 1_000_000);
    assert.equal(seatsLeft(tier), 1);
  });

  it('S06 rejects overselling without changing the tier', () => {
    const { store, tier } = publishedStore();
    bookTickets(store, tier.id, 'user-1', 2);
    errorCode(() => bookTickets(store, tier.id, 'user-2', 2), 'SOLD_OUT');
    assert.equal(tier.sold, 2);
  });

  it('S06 rejects zero, negative, fractional, and over-limit quantities', () => {
    const { store, tier } = publishedStore();
    for (const quantity of [0, -1, 1.5, 11]) errorCode(() => bookTickets(store, tier.id, 'user-1', quantity), 'VALIDATION');
  });
});

const summaries = [
  { id: '1', title: 'Lagos Tech Meetup', city: 'Lagos', venue: 'Civic Hall', startsAt: '2026-12-05T17:00:00.000Z', tiers: [{ priceCents: 500, capacity: 10, sold: 2 }] },
  { id: '2', title: 'Abuja Jazz Night', city: 'Abuja', venue: 'Blue Room', startsAt: '2026-12-05T12:00:00.000Z', tiers: [{ priceCents: 300, capacity: 5, sold: 5 }] },
  { id: '3', title: 'No Tickets', city: 'Lagos', venue: 'Park', startsAt: '2026-12-06T12:00:00.000Z', tiers: [] },
];

describe('Build 2 search and sorting criteria', () => {
  it('S05 searches title or venue and matches city case-insensitively', () => {
    assert.deepEqual(filterEvents(summaries, { q: 'JAZZ' }).map((event) => event.id), ['2']);
    assert.deepEqual(filterEvents(summaries, { city: 'lagos' }).map((event) => event.id), ['1', '3']);
  });

  it('S05 filters maximum cheapest price and leaves no-tier events out', () => {
    assert.deepEqual(searchEvents(summaries, { maxPriceCents: 400 }, 'price').map((event) => event.id), ['2']);
  });

  it('S05 sorts dates, with title then id tie-breakers, and includes a date-only end day', () => {
    const earlier = [summaries[0], summaries[1]];
    assert.deepEqual(sortEvents(earlier, 'date').map((event) => event.id), ['2', '1']);
    const sameDay = [summaries[0], { ...summaries[1], title: 'A Night', startsAt: summaries[0].startsAt }];
    assert.deepEqual(sortEvents(sameDay, 'date').map((event) => event.title), ['A Night', 'Lagos Tech Meetup']);
    assert.deepEqual(filterEvents([summaries[0]], { to: '2026-12-05' }).map((event) => event.id), ['1']);
  });

  it('S05 filters availability and validates dates, prices, and sort options', () => {
    assert.deepEqual(filterEvents(summaries, { onlyAvailable: true }).map((event) => event.id), ['1']);
    errorCode(() => filterEvents(summaries, { from: 'bad-date' }), 'VALIDATION');
    errorCode(() => filterEvents(summaries, { maxPriceCents: 1.2 }), 'VALIDATION');
    errorCode(() => sortEvents(summaries, 'name'), 'VALIDATION');
  });

  it('S05 never mutates input lists and handles empty lists', () => {
    const original = summaries.slice();
    filterEvents(summaries, { q: 'lagos' });
    sortEvents(summaries, 'price');
    assert.deepEqual(summaries, original);
    assert.deepEqual(sortEvents([], 'date'), []);
    assert.deepEqual(filterEvents([], {}), []);
  });

  it('mergeSort is stable, returns a new array, and does not use the input array', () => {
    const input = [{ key: 1, name: 'first' }, { key: 1, name: 'second' }, { key: 0, name: 'zero' }];
    const result = mergeSort(input, (left, right) => left.key - right.key);
    assert.notStrictEqual(result, input);
    assert.deepEqual(result.map((item) => item.name), ['zero', 'first', 'second']);
    assert.deepEqual(input.map((item) => item.name), ['first', 'second', 'zero']);
  });
});
