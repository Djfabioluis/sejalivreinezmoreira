import { BookingContext, extractBookingSlots } from '../context';

describe('Booking Session Reset - Structural Regression', () => {
  it('should reset session when a new booking intent is detected during AWAITING_CONFIRMATION', () => {
    const previous: BookingContext = {
      appointmentStatus: 'AWAITING_CONFIRMATION',
      awaitingConfirmation: true,
      selectedSlot: '2026-08-18T10:00:00Z',
      date: '2026-08-18',
      serviceName: 'PEDICURE',
      unitId: '5258'
    };

    const text = 'Quero marcar manicure para amanhã de manhã';
    const now = new Date('2026-08-17T12:00:00Z');
    
    const extracted = extractBookingSlots(text, now, previous);

    expect((extracted as any)._isReset).toBe(true);
    expect(extracted.serviceName).toBeNull();
    expect(extracted.date).toBe('2026-08-18');
    expect(extracted.period).toBe('manhã');
    expect(extracted.awaitingConfirmation).toBeUndefined(); // extract only returns what changed
  });

  it('should reset session when a new booking intent is detected after CONFIRMED', () => {
    const previous: BookingContext = {
      appointmentStatus: 'CONFIRMED',
      appointmentId: '12345',
      date: '2026-08-17',
      serviceName: 'MANICURE',
      unitId: '5258'
    };

    const text = 'quero agendar manicure para quarta';
    const now = new Date('2026-08-17T12:00:00Z');
    
    const extracted = extractBookingSlots(text, now, previous);

    expect((extracted as any)._isReset).toBe(true);
    expect(extracted.date).toBe('2026-08-19'); // Wednesday if today is Monday 17th
  });
});
