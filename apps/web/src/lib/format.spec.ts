import { describe, expect, it } from 'vitest';
import { formatDuration, formatINR } from './format';

describe('formatINR', () => {
  // Tariffs are round numbers; "₹40.00/hr" on a parking card reads like a bank
  // statement. Decimals appear only when there are actually paise to show.
  it('drops decimals for whole rupees', () => {
    expect(formatINR(4000)).toBe('₹40');
  });

  it('keeps two decimals when the amount has paise', () => {
    expect(formatINR(4720)).toBe('₹47.20');
  });

  it('never shows fractional paise', () => {
    expect(formatINR(1)).toBe('₹0.01');
  });

  it('handles zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });
});

describe('formatDuration', () => {
  it('renders whole hours without a minutes segment', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('renders minutes-only under an hour', () => {
    expect(formatDuration(45)).toBe('45m');
  });

  it('renders combined hours and minutes', () => {
    expect(formatDuration(150)).toBe('2h 30m');
  });
});
