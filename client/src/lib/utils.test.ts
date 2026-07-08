import { describe, it, expect } from 'vitest';
import { formatNumber, formatDuration, cn } from './utils';

describe('formatNumber', () => {
  it('formats thousands and millions', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(2_000_000)).toBe('2M');
  });
});

describe('formatDuration', () => {
  it('formats seconds into m:ss', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(90)).toBe('1:30');
  });
});

describe('cn', () => {
  it('merges tailwind classes with precedence', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-white', false && 'hidden', 'font-bold')).toBe('text-white font-bold');
  });
});
