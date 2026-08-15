# Plano de Correção: Persistência de Contexto de Agendamento (ServiceId)

Corrigir a falha onde a Julia perde o `serviceId` resolvido anteriormente ao processar uma data na mensagem seguinte, impedindo a consulta de disponibilidade.

## Ações Realizadas e Pendentes

1. **Correção de Extração e Merge**:
   - Ajustado `src/lib/booking/context.ts` para garantir que `serviceText` seja extraído de padrões comuns mesmo que o ID ainda não tenha sido resolvido pela BEMP.
   - Reforçado o `mergeBookingContext` para garantir que `serviceId` e `serviceName` sejam preservados aditivamente.

2. **Correção de Resolução em Chat Server**:
   - Ajustado `src/lib/chat.server.ts` (`list_services`) para reaproveitar o `serviceId` já presente no `bookingContext` caso a mensagem atual não traga uma nova intenção de serviço (preservação de contexto).
   - Atualizado o esquema de entrada da ferramenta `list_slots` para aceitar strings/números, evitando erros de tipagem da API.

3. **Correção de Erros de Build**:
   - Corrigir `src/lib/booking/tests/diagnose_availability.ts` removendo referências a colunas inexistentes (`phone`, `last_message_at`).
   - Corrigir `src/lib/booking/tests/validate_fix.ts` ajustando a passagem de `bookingContext` no `runAgent`.

4. **Validação**:
   - Executar script de teste automatizado para garantir que o fluxo "Serviço -> Data -> Disponibilidade" funcione sem perda de ID.

## Detalhes Técnicos

- **Preservação**: O `finalServiceId` agora considera `extracted.serviceId || bookingContext.serviceId`.
- **Flexibilidade**: `list_slots` usa `z.union([z.string(), z.number()])` para maior resiliência com IDs da BEMP.
- **Segurança**: As proteções de preço (`priceAuditor`) foram mantidas e integradas ao fluxo de persistência.
