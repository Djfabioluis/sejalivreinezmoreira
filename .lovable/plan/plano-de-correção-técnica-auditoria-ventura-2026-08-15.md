# Plano de Correção Técnica - Auditoria Ventura

Autorização para correção das duas causas raiz comprovadas no trace real (`webhook-1786818936885`).

## CAUSA 1 — FILTRO CASE-SENSITIVE
**Problema:** A comparação `name.includes(normalizedSearch)` falhou porque o nome retornado pela BEMP era "Manicure" (M maiúsculo) e a busca era "manicure" (minúsculo), resultando em `candidates = null`.
**Correção:** Implementar normalização em ambos os lados da comparação.

## CAUSA 2 — RPC append_wa_message
**Problema:** Erro `PGRST202` — Assinatura incompatível. O código enviava 7 parâmetros, mas o banco espera `(p_new_message, p_phone)`.
**Correção:** Centralizar a chamada da RPC em um helper e adaptar todos os pontos de chamada para a assinatura real.

## Detalhes Técnicos

### 1. Filtro Case-Insensitive em `src/lib/chat.server.ts`
- Alterar a filtragem de serviços para usar a mesma normalização textual em ambos os lados.
- **Antes:** `s.name.toLowerCase().includes(normalizedSearch)`
- **Depois:** `normalizeServiceSearchText(s.name).includes(normalizedSearch)`

### 2. Correção da RPC `append_wa_message`
- Criar `src/lib/booking/persistence-helper.server.ts` para encapsular a chamada da RPC com os parâmetros `p_new_message` e `p_phone`.
- Atualizar `src/lib/chat.server.ts` para usar este helper ao persistir o histórico da IA.
- Garantir que o `bookingContext` seja incluído no payload da mensagem para persistência correta do estado.

### 3. Validação
- Executar teste simulado com o payload real: "quero fazer mao hoje" na unidade Ventura.
- Verificar se `FILTERED_COUNT > 0` e `BOOKING_CONTEXT_PERSISTED = SUCCESS`.

**Restrição:** Não alterar prompt, modelos AI, ou fluxos de subscrição nesta etapa.
