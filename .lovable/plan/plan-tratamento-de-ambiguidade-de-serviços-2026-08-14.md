# Plan - Tratamento de Ambiguidade de Serviços

Implementar a detecção e o tratamento determinístico de ambiguidade na resolução de serviços, garantindo que a Julia IA peça esclarecimentos ao cliente quando múltiplos serviços plausíveis forem encontrados, em vez de selecionar um arbitrariamente.

## User Review Required

> [!IMPORTANT]
> A lógica de ambiguidade será puramente baseada nos resultados reais retornados pela API BEMP para a unidade atual. Não haverá nomes de serviços fixos no código.

## Proposed Changes

### Logic & Backend

#### [src/lib/booking/context.ts]
- Adicionar campos `clarificationRequired` e `candidates` à interface `BookingContext`.
- `clarificationRequired`: boolean que sinaliza a necessidade de esclarecimento.
- `candidates`: array de objetos `{ id, name, price }` para armazenar as opções reais encontradas.

#### [src/lib/chat.server.ts]
- Refatorar a ferramenta `list_services`:
  - Se múltiplos serviços forem encontrados via busca semântica, marcar `clarificationRequired: true` e salvar os `candidates` no `bookingContext` do cliente via `patchCustomerContext`.
  - Se apenas UM serviço for inequivocamente resolvido, manter o comportamento atual (selecionar ID e registrar no `priceAuditor`).
  - Se nenhum for encontrado, manter o comportamento seguro (bloquear alucinação).

#### [src/lib/evolution/reply.server.ts]
- Ajustar o interceptor `replyWithAI`:
  - Se `clarificationRequired` estiver ativo no contexto, garantir que a resposta da IA apresente apenas os nomes reais dos candidatos salvos.
  - Bloquear qualquer tentativa de informar preço enquanto o estado de ambiguidade persistir.

#### [src/lib/booking/context.ts] (Resolução de Continuação)
- Ajustar `extractBookingSlots` para, em estado de ambiguidade, tentar resolver a escolha do cliente (ex: "a primeira opção", "corte feminino") contra a lista de `candidates` armazenada.

## Technical Details

- **Persistência**: Os candidatos serão persistidos no campo `customer_context` da tabela `wa_conversas` para manter o estado entre mensagens.
- **Resolução Semântica**: Utilizará a lista de `candidates` como filtro prioritário se a flag `clarificationRequired` estiver ativa.
- **Proteção de Preço**: O `priceAuditor` continuará sendo a última barreira, exigindo que qualquer preço citado bata com o `officialPrice` do serviço selecionado.

## Verification Plan

### Automated Tests
- Executar `src/lib/booking/tests/audit_prices_v2.ts` (18 testes base).
- Criar script complementar para testar o fluxo de esclarecimento:
  1. Enviar "Quanto custa corte?" -> Verificar estado `clarificationRequired` e lista de candidatos.
  2. Enviar "O segundo" -> Verificar se o `serviceId` do segundo candidato é resolvido corretamente.
  3. Verificar se o preço final enviado ao WhatsApp bate com o BEMP.
  4. Garantir que `PRICE_MISMATCH_BLOCKED` ainda funciona se simulado um valor incorreto após a resolução.
