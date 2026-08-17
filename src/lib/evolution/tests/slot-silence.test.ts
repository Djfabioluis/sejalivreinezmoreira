import { describe, it, expect, vi } from 'vitest';
import { runAgentFlow } from '../agent.server';
import * as reply from '../reply.server';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockImplementation(async () => {
    return {
      data: {
        id: 'conv_123',
        phone: '554199102791',
        instance: 'Ventura',
        attendance_mode: 'AI',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'horários' }] }],
        customer_context: {
          bookingContext: {
            unitId: '5258',
            serviceId: '18604',
            serviceName: 'MANICURE',
            date: '2026-08-17',
            professionalId: '29461',
            professionalName: 'Juliana Muller',
            period: 'noite',
            availableSlots: [
              '2026-08-17T18:00:00.000-03:00',
              '2026-08-17T20:00:00.000-03:00'
            ],
            appointmentStatus: 'NONE'
          }
        }
      }
    };
  }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null })
};

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: mockSupabase
}));

vi.mock('../reply.server', () => ({
  replyWithAI: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock('../../chat.server', () => ({
  patchCustomerContext: vi.fn().mockResolvedValue({}),
  runAgentWithLogging: vi.fn().mockResolvedValue({ text: "Qual horário você prefere?" })
}));

describe('Slot Selection Silence Bug', () => {
  it('should transition to confirmation and send outbound message when "as 18" is sent', async () => {
    const mockMsg = {
      messageId: 'msg_123',
      instance: 'Ventura',
      remoteJid: '554199102791@s.whatsapp.net',
      message: { conversation: 'as 18' },
      pushName: 'Fabio Luis'
    };

    await runAgentFlow(mockMsg as any);

    // Verify if replyWithAI was called with confirmation text
    expect(reply.replyWithAI).toHaveBeenCalled();
    const calls = (reply.replyWithAI as any).mock.calls;
    const confirmationCall = calls.find((c: any) => c[0].text.includes('Confirma seu agendamento?'));
    
    expect(confirmationCall).toBeDefined();
    expect(confirmationCall[0].text).toContain('18:00');
    expect(confirmationCall[0].text).toContain('Juliana Muller');
  });
});
