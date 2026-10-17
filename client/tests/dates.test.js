import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { excelDateToJSDate, formatExpirationDate, getExpirationStatusClass } from '../src/utils/dates.js';

describe('Excel dates', () => {
  it('converts serial numbers (days since 1900) to dates', () => {
    expect(excelDateToJSDate(25569).toISOString()).toBe('1970-01-01T00:00:00.000Z');
    expect(excelDateToJSDate('45000').toISOString().slice(0, 10)).toBe('2023-03-15');
  });

  it('returns null for empty or non-numeric input', () => {
    expect(excelDateToJSDate(null)).toBeNull();
    expect(excelDateToJSDate('')).toBeNull();
    expect(excelDateToJSDate('soon')).toBeNull();
  });
});

describe('formatExpirationDate', () => {
  it('shows ISO strings, Excel serials (number or digit string) and Date objects the same way', () => {
    expect(formatExpirationDate('2030-01-31T12:00:00Z')).toBe('Jan 31, 2030');
    expect(formatExpirationDate(47514)).toBe(formatExpirationDate('47514'));
    expect(formatExpirationDate(new Date('2030-01-31T12:00:00Z'))).toBe('Jan 31, 2030');
  });

  it('shows a dash when there is nothing usable', () => {
    for (const value of [null, undefined, '', 'not a date', 0]) expect(formatExpirationDate(value)).toBe('-');
  });
});

describe('getExpirationStatusClass', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('marks past dates as expired', () => {
    expect(getExpirationStatusClass('2026-06-14')).toBe('expired');
    expect(getExpirationStatusClass('2020-01-01')).toBe('expired');
  });

  it('marks dates within three months as expiring soon', () => {
    expect(getExpirationStatusClass('2026-06-16')).toBe('expiring-soon');
    expect(getExpirationStatusClass('2026-09-14')).toBe('expiring-soon');
  });

  it('leaves later dates, empty values and rubbish unmarked', () => {
    expect(getExpirationStatusClass('2026-09-16')).toBe('');
    expect(getExpirationStatusClass('2030-01-01')).toBe('');
    expect(getExpirationStatusClass(null)).toBe('');
    expect(getExpirationStatusClass('nonsense')).toBe('');
  });

  it('understands Excel serial numbers too', () => {
    expect(getExpirationStatusClass(40000)).toBe('expired');
    expect(getExpirationStatusClass(60000)).toBe('');
  });
});
