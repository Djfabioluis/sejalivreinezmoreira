import { describe, it, expect } from 'vitest';
import { extractBookingSlots } from '../context';
import { getLocalBookingDate, addLocalDays } from '../local-date';

describe('Date and Period Extraction', () => {
  const now = new Date('2026-08-17T15:00:00Z'); // Uma segunda-feira às 12h local (UTC-3)
  const today = getLocalBookingDate(now);
  const tomorrow = addLocalDays(today, 1);

  it('extracts date and period from "hoje a noite"', () => {
    const res = extractBookingSlots('hoje a noite', now);
    expect(res.date).toBe(today);
    expect(res.period).toBe('noite');
  });

  it('extracts date and period from "hoje a noi" (typo tolerance)', () => {
    const res = extractBookingSlots('hoje a noi', now);
    expect(res.date).toBe(today);
    expect(res.period).toBe('noite');
  });

  it('extracts date and period from "amanha de manha"', () => {
    const res = extractBookingSlots('amanha de manha', now);
    expect(res.date).toBe(tomorrow);
    expect(res.period).toBe('manhã');
  });

  it('extracts date from "hoje" alone', () => {
    const res = extractBookingSlots('hoje', now);
    expect(res.date).toBe(today);
  });
});
