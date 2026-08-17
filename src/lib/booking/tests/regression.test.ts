import { describe, it, expect, vi } from 'vitest';
import { extractBookingSlots, mergeBookingContext } from '../context';

describe('Fluxo de Agendamento - Regressão', () => {
  const now = new Date('2026-08-17T10:00:00');

  it('TESTE A: "Quero fazer mão hoje" -> Manicure', () => {
    const text = "Quero fazer mão hoje";
    const extracted = extractBookingSlots(text, now);
    expect(extracted.serviceText).toBe('manicure');
    expect(extracted.date).toBe('2026-08-17');
  });

  it('TESTE B: Detecção de períodos', () => {
    expect(extractBookingSlots("tarde", now).period).toBe('tarde');
    expect(extractBookingSlots("a tarde", now).period).toBe('tarde');
    expect(extractBookingSlots("à tarde", now).period).toBe('tarde');
    expect(extractBookingSlots("manhã", now).period).toBe('manhã');
    expect(extractBookingSlots("noite", now).period).toBe('noite');
  });

  it('TESTE C: Extração de HH:mm e Validação de Slot', () => {
    const previous = {
      availableSlots: ['2026-08-17T14:30:00', '2026-08-17T15:00:00']
    };
    const extracted = extractBookingSlots("14:30", now, previous as any);
    expect(extracted.time).toBe('14:30');
    expect(extracted.selectedSlot).toBe('2026-08-17T14:30:00');

    const invalid = extractBookingSlots("16:00", now, previous as any);
    expect(invalid.time).toBe('16:00');
    expect(invalid.selectedSlot).toBeUndefined();
  });

  it('TESTE F: Preservação de Candidates', () => {
    const previous = {
      clarificationRequired: true,
      candidates: [{ id: '1', name: 'Manicure Simples', price: 50 }]
    };
    const extracted = {};
    const merged = mergeBookingContext(previous as any, extracted);
    expect(merged.candidates).toBeDefined();
    expect(merged.clarificationRequired).toBe(true);
  });

  it('TESTE G: Reset de Contexto', () => {
    const previous = {
      serviceId: 'old',
      date: '2026-01-01',
      unitId: '5258',
      awaitingConfirmation: false
    };
    const text = "quero fazer mão hoje";
    const extracted = extractBookingSlots(text, now, previous as any);
    
    // O merge deve resultar em um contexto com a nova data e serviço, mas sem o ID antigo
    const merged = mergeBookingContext(previous as any, extracted);
    expect(merged.date).toBe('2026-08-17');
    expect(merged.serviceText).toBe('manicure');
    expect(merged.serviceId).toBeNull();
  });
});
