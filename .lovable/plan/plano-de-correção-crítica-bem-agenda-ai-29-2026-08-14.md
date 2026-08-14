# Plano de Correção Crítica - Bem Agenda AI (29)

Este plano aborda falhas no pipeline de mensagens, resolução de instâncias e automação de agendamento determinístico.

## Problemas Identificados
1.  **Silêncio no Webhook:** Mensagens sem agente ou com IA inativa são marcadas como `processed` sem log de erro ou resposta manual necessária.
2.  **Frágilidade na Resolução de Agente:** A busca por instância é sensível a espaços e capitalização.
3.  **Fluxo de Agendamento Não Determinístico:** A IA pergunta dados que já possui ou repete perguntas após confirmações.
4.  **Perda de Contexto:** Dados de serviço ou data "somem" durante a conversa.
5.  **Falha na Seleção de Horários:** O sistema não correlaciona horários em formatos diferentes (ex: ISO vs HH:mm).

## Alterações Propostas

### 1. Robustez no Webhook (`src/lib/evolution/processor.server.ts`)
- Substituir `markEventProcessed` por `markEventFailed` com códigos específicos (`AGENT_NOT_FOUND`, `IA_DISABLED_ADMIN`, `NO_UNIT`) em falhas críticas.
- Garantir que NENHUMA mensagem termine em `PROCESSED` sem um motivo explícito de bloqueio ou envio.

### 2. Resolução de Instância (`src/lib/evolution/agent.server.ts`)
- Normalizar o nome da instância (trim, lowercase) antes da busca no banco.
- Implementar log detalhado `[INSTANCE_AGENT_MATCH]` para depuração.

### 3. Máquina de Estados Determinística (`src/lib/booking/context.ts` e `lifecycle.ts`)
- Criar `src/lib/booking/lifecycle.ts` para centralizar a lógica de "Próximo Passo" e "Respostas Prontas".
- Ampliar `isShortAffirmative` para aceitar variações como "pode marcar", "fechado", "ok".
- Implementar proteção para que o Gemini NÃO controle o estado do agendamento, apenas humanize a resposta baseada no estado definido pelo sistema.

### 4. Melhoria no Merge e Extração (`src/lib/booking/context.ts`)
- Reforçar o merge para que `serviceName` e `date` sejam persistentes.
- Melhorar o parser de horários para comparar frações de tempo (HH:mm) com horários ISO vindos da Bemp.

### 5. Execução Direta (`src/lib/evolution/agent.server.ts`)
- Quando o estado for `CREATING` (pós-confirmação), chamar `BempService.createAppointment` imediatamente sem passar pelo Gemini.
- Preservar o contexto em caso de falha no Bemp para permitir correção pontual em vez de reiniciar o fluxo.

## Detalhes Técnicos
- **Normalização de Instância:** `instance.trim().toLowerCase()` vs `instancia_normalizada` no banco (ou `lower(instancia)` na query).
- **Log de Auditoria:** Adição de `traceId` em todos os checkpoints para rastreabilidade ponta a ponta.
- **Tratamento de Erros:** Introdução de `DB_PERSISTENCE_ERROR` e `BEMP_API_ERROR` com preservação de estado.
