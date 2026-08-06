# Diagnóstico de Instabilidade nos Agendamentos

## Problema Original
A IA respondia mensagens genéricas de "instabilidade momentânea" ao encontrar qualquer erro no fluxo de agendamento (BEMP, Evolution ou lógica interna), mascarando a causa real e dificultando a correção.

## Localização do Fallback
O fallback genérico estava centralizado em `src/lib/evolution/failure.ts` e era consumido pelo orquestrador em `src/lib/chat.server.ts` através da função `classifyFailure`.

## Implementação da Solução
1. **Remoção de Metadata**: Instruções técnicas removidas da landing page (`src/routes/index.tsx`).
2. **Classificação Estruturada**: Substituição do `catch` genérico por uma classificação detalhada baseada em `AppError`.
3. **Logs Estruturados**: Implementação de rastreabilidade com `traceId` e etapas do fluxo.
4. **Handoff Real**: Quando um erro crítico ocorre, a IA é pausada e a conversa é marcada para atendimento humano.

## Códigos de Erro Implementados
- `BEMP_UNAUTHORIZED` (401/403)
- `BEMP_RATE_LIMITED` (429)
- `BEMP_TIMEOUT` (Timeout de conexão)
- `BEMP_UNAVAILABLE` (5xx)
- `BEMP_INVALID_DATA` (422)
- `EVOLUTION_SEND_FAILED`
- `PLAN_NOT_ACTIVE` / `PLAN_NO_BALANCE`
- `SERVICE_NOT_AVAILABLE_IN_UNIT`

## Testes e Riscos
- Simulação de falhas de integração realizada em ambiente sandbox.
- **Risco**: Timeouts excessivos na API do BEMP podem ainda causar latência perceptível antes do handoff.
