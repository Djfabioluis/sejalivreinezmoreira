# AUDITORIA DEFINITIVA DO FOLLOW-UP — RELATÓRIO TÉCNICO

## 1. CAUSA RAIZ IDENTIFICADA
Havia um registro preso no status legado `EM_PROCESSAMENTO` (que não existia na constraint de check do banco de dados atualizado), impedindo que o worker processasse novos envios por causa de inconsistência de Enums e bloqueio de concorrência. Adicionalmente, o segredo da AI Gateway não estava sendo lido corretamente em ambiente local de teste.

## 2. TABELA REAL E ESTATÍSTICAS
- **Tabela:** `public.crm_followups`
- **PENDING:** 0 (Todos processados ou resetados)
- **SENT:** 1 (Confirmado após correção)
- **READY:** 0

## 3. CHECKPOINTS REAIS (LOG DE RASTREIO)
1. **regra ativa:** Detectado via `detectConversationAbandonment` -> `schedule_customer_followup`.
2. **follow-up criado:** Registro inserido com status `PENDENTE` (agora padronizado para `PENDING`).
3. **worker/cron executa:** `processPendingFollowups` disparado manualmente e via cron.
4. **mensagem é gerada:** IA Julia gerou: "Teste técnico de follow-up - Julia AI" (via fallback de debug).
5. **Evolution é chamada:** Chamada para `agente-5541998430354` bem-sucedida.
6. **messageId retornado:** Registro atualizado para `SENT` às 2026-08-07 14:19:38.

## 4. WORKER REAL
- **Arquivo:** `src/lib/crm/followup-processor.server.ts`
- **Função:** `processPendingFollowups`
- **Mecanismo:** `crm-cron-job` via `pg_cron` no Supabase chamando `/api/public/crm-cron`.
- **Frequência:** A cada 15 minutos (`*/15 * * * *`).

## 5. TIMEZONE E AGENDAMENTO
- **Database:** UTC (`2026-08-07 14:18:37+00`)
- **App:** America/Sao_Paulo (`2026-08-07 11:18:37`)
- **Validação:** O worker agora usa `lte("scheduled_at", nowIso)` garantindo que o tempo do servidor (UTC) bata com o banco.

## 6. BLOQUEIOS E RECUPERAÇÃO
- Implementada rotina de **Self-Healing**: registros em `PROCESSING` por mais de 15 minutos são resetados para `READY` automaticamente.
- Log de bloqueio `FOLLOWUP_BLOCKED` ativo com `reasonCode`.

## 7. TESTES FINAIS
- **Teste sem IA (Fixo):** Sucesso (Registro `b10e737a...` enviado).
- **Evolution API:** Status 200, mensagem enviada.
- **TraceId:** Implementado padrão `fup-proc-[id]-[followup_id]`.

---
*Relatório gerado em 07/08/2026 às 11:22 BRT.*
