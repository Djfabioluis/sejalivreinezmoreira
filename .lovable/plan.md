# Plano de Correção Definitiva da Julia IA (WhatsApp/Evolution)

Este plano visa corrigir o fluxo de resposta da Julia IA, garantindo que o webhook processe as mensagens de forma confiável em ambientes serverless, resolva identidades `@lid` corretamente e não descarte erros silenciosamente.

## Alterações Técnicas

### 1. Webhook (`src/routes/api/public/whatsapp-evolution.ts`)
- **AWAIT Total**: Remover `catch` silenciador e garantir que `processMessagesUpsert` seja totalmente aguardado.
- **Status HTTP**: Retornar 5xx em falhas de processamento para permitir retentativa da Evolution API.
- **Autenticação**: Suportar compatibilidade com segredos via headers/query, com log de aviso se não configurado.

### 2. Processamento (`src/lib/evolution/processor.server.ts`)
- **Propagação de Erros**: Garantir que erros de IA e envio sejam lançados até o webhook.
- **Trace de Performance**: Adicionar checkpoints obrigatórios (`LOCK_ACQUIRED`, `AI_REQUEST_STARTED`, etc).
- **Idempotência**: Não marcar como processado se o envio falhou.

### 3. Identidade e Agente (`src/lib/evolution/contact.ts`, `src/lib/evolution/agent.server.ts`)
- **Identidade `@lid`**: Implementar resolução única com prioridade para `remoteJidAlt`.
- **Busca de Agente**: Evitar `maybeSingle()` se houver duplicidade, preferindo agentes ativos com unidade.

### 4. Envio de Resposta (`src/lib/evolution/reply.server.ts`, `src/lib/evolution.server.ts`)
- **Validação de Envio**: Lançar `EVOLUTION_REPLY_SEND_FAILED` se a Evolution não confirmar o envio.
- **Idempotência de Slot**: Permitir nova tentativa se o envio anterior falhou.

## Usuário não técnico
- A IA passará a ser muito mais confiável ao responder mensagens, especialmente quando o WhatsApp usa identificadores novos (como o sistema `@lid`).
- Erros temporários da rede ou da API serão detectados e a mensagem será processada novamente de forma automática.
- Você verá logs mais detalhados para entender exatamente por que uma mensagem foi ou não respondida.
