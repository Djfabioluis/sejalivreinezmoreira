import { describe, it, expect, beforeEach } from 'vitest';
import { extractBookingSlots, nextRequiredSlot, matchProfessionalChoice } from '../context';
import { getLocalBookingDate } from '../local-date';

describe('Professional Selection Bug Regression', () => {
  const now = new Date('2026-08-17T15:00:00Z');
  const today = getLocalBookingDate(now);

  let initialContext: any;

  beforeEach(() => {
    initialContext = {
      unitId: '5258',
      serviceId: '123',
      serviceName: 'Manicure',
      serviceText: 'manicure',
      date: today,
      dateLocked: true,
      period: 'noite',
      professionalOptions: [
        { id: '1', name: 'Juliana Muller' },
        { id: '2', name: 'liliane alves' },
        { id: '3', name: 'TUCA DE LARA' },
        { id: '4', name: 'Qualquer profissional disponível' }
      ]
    };
  });

  it('matches "juliana" and updates context correctly', () => {
    const chosen = matchProfessionalChoice('juliana', initialContext.professionalOptions);
    expect(chosen).toBeDefined();
    if (!chosen) throw new Error('Professional not matched');
    expect(chosen.name).toBe('Juliana Muller');

    const updatedContext = { ...initialContext };
    updatedContext.professionalId = String(chosen.id);
    updatedContext.professionalName = String(chosen.name);

    const next = nextRequiredSlot(updatedContext);
    expect(next).toBe('availability');
  });

  it('matches "1" as index and updates context', () => {
    const text = '1';
    const chosen = matchProfessionalChoice(text, initialContext.professionalOptions);
    expect(chosen).toBeDefined();
    if (!chosen) throw new Error('Professional index not matched');
    expect(chosen.id).toBe('1');
    expect(chosen.name).toBe('Juliana Muller');
  });
});
