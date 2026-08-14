# Diagnóstico Técnico - Correção de Histórico (Unidade Centro)

## 1. Código Atual de Montagem do Histórico
- **Arquivo**: `src/lib/chat.server.ts`
- **Função**: `runAgentWithLogging` (L392) e `runAgent` (L417)
- **Query**: O histórico é carregado previamente em `agent.server.ts` (L150) da tabela `wa_conversas`.
- **ORDER BY**: Armazenado como JSONB na coluna `messages`. A ordem no array JSONB reflete a inserção (cronológica).
- **LIMIT atual**: `slice(-8)` turns (aproximadamente 16 mensagens se cada turn tiver user+assistant) em `runAgentWithLogging`.
- **Formato Final**: `convertToModelMessages(messages)` (L442) converte o array de objetos para o formato exigido pelo SDK da Vercel AI (Gemini).

## 2. Isolamento do Histórico
- **Confirmado**: O histórico é carregado via `supabaseAdmin.from("wa_conversas").eq("phone", conversationKey)`.
- **Chave de Isolamento**: `conversationKey` é construído por `instancia:telefone`, garantindo que mensagens de outras unidades ou agentes nunca se misturem, mesmo para o mesmo número de cliente.

## 3. Métricas do Último Teste (Falha no Centro)
- **TraceId**: `webhook-1786731178638`
- **Mensagens Existentes**: 104 mensagens.
- **Mensagens Enviadas**: 102 mensagens (foi identificado que em `agent.server.ts` o histórico completo era passado, ignorando o slice de `runAgentWithLogging` em alguns fluxos).
- **Tokens Aproximados**: ~4.000 tokens (Request total).
- **Resultado Gemini**: `finishReason: STOP`, `text: ""` (Resposta Vazia/Recusa Silenciosa).

## 4. Comparação com Teste Bem-sucedido
| Métrica | CENTRO (Falha) | CENTRO (Sucesso Anterior) |
| :--- | :--- | :--- |
| **History Messages** | 102 | 46 |
| **Tokens (aprox.)** | 4.000 | 1.800 |
| **Resultado Gemini** | Vazio (Recusa) | Sucesso |

---

# Proposta de Correção Autorizada

Implementarei um limite seguro e determinístico diretamente na função `runAgent`, garantindo que, independentemente do fluxo chamador, a IA nunca receba mais do que o necessário para manter o contexto operacional.

- **Limite Escolhido**: 12 mensagens (aproximadamente 6 turnos completos).
- **Justificativa**: 5 turnos (10 msgs) pode ser curto para fluxos de agendamento complexos; 12 mensagens preservam a memória imediata (serviço, data, profissional) sem degradar a performance do Gemini 2.5 Flash em contextos fragmentados.

**Arquivos a serem alterados:**
1. `src/lib/chat.server.ts`: Aplicar o `slice(-12)` dentro de `runAgent` para garantir a proteção em todos os pontos de entrada.

Aguardando aplicação.
