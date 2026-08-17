import { describe, it, expect } from 'vitest';
import { extractBookingSlots, BookingContext } from '../context';

describe('Slot Selection Bug Regression', () => {
  const baseContext: BookingContext = {
    serviceName: 'manicure',
    date: '2026-08-17',
    professionalName: 'Juliana Muller',
    period: 'noite',
    availableSlots: ['18:00', '20:00', '20:40', '21:20'],
    appointmentStatus: 'NONE',
  };

  it('should resolve "as 18" to "18:00" using availableSlots', () => {
    const text = 'as 18';
    const extracted = extractBookingSlots(text, new Date(), baseContext);
    
    expect(extracted.time).toBe('18:00');
    expect(extracted.selectedSlot).toBe('18:00');
  });

  it('should resolve "18" to "18:00" using availableSlots', () => {
    const text = '18';
    const extracted = extractBookingSlots(text, new Date(), baseContext);
    
    expect(extracted.time).toBe('18:00');
    expect(extracted.selectedSlot).toBe('18:00');
  });

  it('should resolve "20:40" to "20:40"', () => {
    const text = '20:40';
    const extracted = extractBookingSlots(text, new Date(), baseContext);
    
    expect(extracted.time).toBe('20:40');
    expect(extracted.selectedSlot).toBe('20:40');
  });

  it('should NOT resolve "19" if it is not in availableSlots', () => {
    const text = '19';
    const extracted = extractBookingSlots(text, new Date(), baseContext);
    
    expect(extracted.time).toBe('19:00');
    expect(extracted.selectedSlot).toBeUndefined();
  });
});
