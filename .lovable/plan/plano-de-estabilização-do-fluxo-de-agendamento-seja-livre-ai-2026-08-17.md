# Plano de Estabilização do Fluxo de Agendamento - Seja Livre AI

## 1. Correção Determinística: Period → List Slots
### Arquivo: `src/lib/chat.server.ts`
- Implementar interceptação no `runAgent` para que, se `unitId`, `serviceId`, `date` e `period` estiverem presentes, mas não houver `time`/`selectedSlot`, o sistema chame `BempService.listAvailableSlots` imediatamente.
- O resultado deve ser filtrado pelo `period` e apresentado como uma mensagem direta do assistente, impedindo que o LLM repita a pergunta.

## 2. Parsing de Horários ISO e Filtro de Períodos
### Arquivo: `src/lib/booking/context.ts` e `src/lib/bemp-service.server.ts`
- Corrigir a extração de hora para suportar formato ISO (`2026-08-16T14:30:00`).
- Usar `new Date(slot).getHours()` e `HH:mm` formatado.
- Normalizar períodos:
  - **Manhã**: "manhã", "de manhã", "pela manhã" (< 12h)
  - **Tarde**: "tarde", "a tarde", "à tarde", "de tarde", "pela tarde" (12h - 18h)
  - **Noite**: "noite", "à noite", "de noite", "pela noite" (>= 18h)

## 3. Resiliência BEMP e Fallback para Horários
### Arquivo: `src/lib/bemp-service.server.ts`
- Replicar a lógica de fallback (Primary -> Relay) em `listAvailableSlots`.
- Garantir que falhas em ambos os métodos não resultem em `[]` silencioso, mas sim em erro propagado.

## 4. Normalização "Mão" → "Manicure" e Ordem de Precedência
### Arquivo: `src/lib/booking/context.ts`
- Atualizar `SERVICE_PATTERNS` para que "pé e mão" seja avaliado antes de "mão" ou "pé".
- Garantir que qualquer variação de "mão" resulte em `serviceText = "manicure"`.

## 5. Persistência de Contexto (Candidates) e Reset
### Arquivo: `src/lib/booking/context.ts` e `src/lib/chat.server.ts`
- Modificar `mergeBookingContext` para preservar `candidates` entre turnos quando `clarificationRequired` for true.
- Implementar lógica de reset: se uma nova intenção clara for detectada ("quero fazer X hoje"), limpar campos de agendamento antigos (date, period, slots, etc.) mantendo apenas identidade.

## 6. Validação de Horário Selecionado
### Arquivo: `src/lib/booking/context.ts`
- Alterar `extractBookingSlots` para que a extração de `time` do texto do usuário seja validada contra `availableSlots` reais.
- `selectedSlot` só é preenchido se houver correspondência exata.

## 7. Segurança de Webhooks e Relays
### Arquivos: `src/routes/api/public/*`
- Adicionar verificação de `BEMP_RELAY_SECRET` no relay.
- Adicionar verificação de `BEMP_WEBHOOK_SECRET` no webhook de cancelamento.
- Adicionar verificação de `EVOLUTION_WEBHOOK_SECRET` no webhook da Evolution.

## 8. Limpeza e UI
- Remover diagnósticos de `src/routes/index.tsx` e restaurar Dashboard.
- Remover arquivos `.js` stale em `src/lib/`.
- Centralizar modelo de IA em `src/lib/chat.server.ts`.

## 9. Verificação Técnica
- Rodar `typecheck` e testes de regressão.
- Criar novos testes para os fluxos A a G especificados.

### Technical Details
- Timezone: `America/Sao_Paulo` for date/time operations.
- Logger: Sanitize PII (phones, JIDs) in logs.
- Fail-Closed: Webhooks return 401/403 on invalid secrets.
