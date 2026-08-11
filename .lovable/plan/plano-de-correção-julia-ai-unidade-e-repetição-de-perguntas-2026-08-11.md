# Plano de Correção: Julia AI - Unidade e Repetição de Perguntas

Este plano corrige dois problemas críticos: a Julia ignorando a unidade vinculada ao número de WhatsApp e a repetição de perguntas sobre informações já fornecidas pelo cliente (especialmente serviços).

## Problema 1: Unidade Determinística pelo Número Receptor
Atualmente, a unidade pode ser perdida ou reinquirida pela IA. A correção garante que o número receptor da mensagem seja a fonte da verdade.

### Ações
- **Webhook e Orquestrador**: No `processMessagesUpsert` e `runAgentFlow`, capturaremos a instância/número receptor e resolveremos a unidade imediatamente.
- **Persistência**: A unidade resolvida será gravada na conversa (`wa_conversas`) e passada como contexto imutável para a IA.
- **Contexto da IA**: Injetaremos um bloco `ACTIVE_UNIT` no prompt do sistema, instruindo a Julia a NUNCA perguntar a unidade, a menos que o cliente peça explicitamente para trocar.

## Problema 2: Redução de Repetição e Extração de Intenção
A IA pergunta "Qual serviço?" mesmo quando o cliente já o disse. A correção implementa um processamento pré-IA para extrair intenções.

### Ações
- **Extração Proativa**: Antes de chamar o Gemini, tentaremos identificar o serviço na mensagem atual usando `BempService.searchServicesByCategory` e alias conhecidos.
- **Slot Filling**: Manteremos um estado de "campos conhecidos" (serviço, data, profissional) no `customer_context` da conversa.
- **Prompt Dinâmico**: O prompt listará explicitamente o que já sabemos, proibindo a Julia de perguntar esses dados novamente.

## Alterações Técnicas

### 1. `src/lib/evolution/processor.server.ts`
- Adicionar log `[UNIT_RESOLVED_FROM_INCOMING_NUMBER]`.
- Garantir que a `unidade_id` seja passada corretamente para o `runAgentFlow`.

### 2. `src/lib/evolution/agent.server.ts`
- Refinar o `runAgentFlow` para carregar e validar a unidade ativa antes da invocação da IA.
- Implementar a extração de intenção de serviço antes da chamada ao `runAgent`.

### 3. `src/lib/chat.server.ts`
- Atualizar `MANDATORY_SYSTEM_RULES` com restrições mais severas contra repetição.
- Modificar `assembleSystemPrompt` para incluir o bloco de contexto conhecido.

### 4. `src/lib/crm.server.ts`
- Adicionar suporte para inferir e persistir o serviço identificado diretamente via RPC/Supabase.

## Testes de Validação
- **Teste A**: Mensagem "Oi" para o número do Centro -> Deve usar Centro sem perguntar.
- **Teste B**: "Quero escova" -> Deve identificar serviço "Escova" e unidade do número sem perguntar ambos.
- **Teste C**: "Quero manicure amanhã" -> Identificar serviço, unidade e data.
- **Teste D**: "Quero marcar na outra unidade" -> Identificar o pedido de troca e permitir a Julia gerenciar.

---
**Nota**: A implementação focará em lógica determinística antes do LLM, usando o Gemini apenas para o diálogo final baseado em fatos já extraídos.
