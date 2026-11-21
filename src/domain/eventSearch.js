import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

function validDate(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00.000Z`);
    if (date.toISOString().slice(0, 10) !== text) {
      throw new DomainError('VALIDATION', `${field} must be a valid date`);
    }
    return date;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('VALIDATION', `${field} must be a valid date`);
  }
  return date;
}

function cheapestPrice(summary) {
  const prices = (summary.tiers ?? []).map((tier) => tier.priceCents).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : undefined;
}

function seatsAvailable(summary) {
  return (summary.tiers ?? []).reduce(
    (total, tier) => total + (tier.seatsLeft ?? (tier.capacity - tier.sold)), 0,
  );
}

export function filterEvents(summaries, criteria = {}) {
  const { q, city, from, to, maxPriceCents, onlyAvailable } = criteria;
  const query = q == null ? undefined : String(q).toLocaleLowerCase();
  const wantedCity = city == null ? undefined : String(city).toLocaleLowerCase();
  const fromDate = from == null ? undefined : validDate(from, 'from');
  const toDate = to == null ? undefined : validDate(to, 'to');
  if (maxPriceCents != null && !Number.isInteger(maxPriceCents)) {
    throw new DomainError('VALIDATION', 'maxPriceCents must be a whole number');
  }

  return summaries.filter((summary) => {
    const title = String(summary.title ?? '').toLocaleLowerCase();
    const venue = String(summary.venue ?? '').toLocaleLowerCase();
    if (query !== undefined && !title.includes(query) && !venue.includes(query)) return false;
    if (wantedCity !== undefined && String(summary.city ?? '').toLocaleLowerCase() !== wantedCity) return false;
    const startsAt = validDate(summary.startsAt, 'startsAt');
    if (fromDate && startsAt < fromDate) return false;
    if (toDate) {
      const end = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(toDate.getTime() + 86_400_000) : toDate;
      if (startsAt >= end) return false;
    }
    if (maxPriceCents != null && (cheapestPrice(summary) === undefined || cheapestPrice(summary) > maxPriceCents)) return false;
    if (onlyAvailable && seatsAvailable(summary) < 1) return false;
    return true;
  });
}

function compareText(left, right) {
  return String(left.title ?? '').localeCompare(String(right.title ?? '')) ||
    String(left.id ?? '').localeCompare(String(right.id ?? ''));
}

export function sortEvents(summaries, sortBy) {
  if (!['date', 'price', 'availability'].includes(sortBy)) {
    throw new DomainError('VALIDATION', 'Unknown sort option');
  }
  const compare = (left, right) => {
    if (sortBy === 'date') {
      const difference = new Date(left.startsAt) - new Date(right.startsAt);
      return difference || compareText(left, right);
    }
    if (sortBy === 'price') {
      const leftPrice = cheapestPrice(left);
      const rightPrice = cheapestPrice(right);
      if (leftPrice === undefined && rightPrice !== undefined) return 1;
      if (leftPrice !== undefined && rightPrice === undefined) return -1;
      return (leftPrice ?? 0) - (rightPrice ?? 0) || compareText(left, right);
    }
    return seatsAvailable(right) - seatsAvailable(left) || compareText(left, right);
  };
  return mergeSort(summaries, compare);
}

export function searchEvents(summaries, criteria = {}, sortBy) {
  const filtered = filterEvents(summaries, criteria);
  return sortBy == null ? filtered.slice() : sortEvents(filtered, sortBy);
}
