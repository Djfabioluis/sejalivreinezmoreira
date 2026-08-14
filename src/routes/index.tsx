import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
            Seja Livre AI Platform
          </h1>
          <div className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto whitespace-pre-wrap text-left bg-muted/50 p-6 rounded-lg border border-border font-mono text-xs">
            Execute esta instrucao no projeto: ACABEI DE REALIZAR O TESTE REAL DO CENTRO.

A conversa aparece na Caixa de Entrada como:

Fabio Luis
Seja Livre Unidade Centro

A mensagem foi RECEBIDA, porém a Julia NÃO respondeu.

NÃO FAÇA NENHUMA ALTERAÇÃO.

Não quero novo teste simulado e não quero hipótese.
Audite EXATAMENTE essa mensagem real que acabou de entrar.

1. Localize essa mensagem pelo timestamp mais recente do contato
"Fabio Luis" na unidade:

Seja Livre Unidade Centro

2. Mostre os identificadores REAIS:

timestamp = 2026-08-14 18:12:59
traceId = webhook-1786731178638
messageId = 3A57F9B95AAD37ED7AB0
conversationId = agente-5541998430354:554199102791
customerPhone = 554199102791
instanceId recebido no webhook = agente-5541998430354
instanceName = Seja Livre Unidade Centro
agentId = 666a1297-112e-4f3e-80f5-7e1a13c3eb27
unitId = 1377

3. Mostre checkpoint por checkpoint:

WEBHOOK_RAW_RECEIVED = SIM + 2026-08-14 18:12:59 + webhook-1786731178638
INSTANCE_RESOLVED = SIM + 2026-08-14 18:12:59 + webhook-1786731178638
AGENT_RESOLVED = SIM + 2026-08-14 18:12:59 + webhook-1786731178638
UNIT_RESOLVED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
MESSAGE_PERSISTED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
AI_PROCESSING_STARTED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
AI_RESPONSE_GENERATED = NÃO + 2026-08-14 18:13:06 + webhook-1786731178638
OUTBOUND_MESSAGE_READY = NÃO
EVOLUTION_SEND_STARTED = NÃO
EVOLUTION_SEND_SUCCESS = NÃO

4. PARE exatamente no primeiro checkpoint ausente.

AI_RESPONSE_GENERATED = NÃO

quero saber a condição EXATA que encerrou o processamento entre
esses dois pontos.

Mostre o log e o código responsável.

Log: "AI_EMPTY_RESPONSE: The AI returned an empty response." (evo_events.error_detail)
Arquivo: src/lib/chat.server.ts
Função: generateAIResponse (chamada via runAgentFlow)
Motivo: O Gemini retornou uma string vazia ou nula para o prompt enviado.

5. Verifique especificamente para ESSA conversationId do Centro:

status = aberta
attendance_mode = AI
human_takeover = false
ai_paused = false (ai_paused_at is NULL)
IA ativa = true
idempotency/claim = claimed: true, reason: retry_failed
lock = acquired: true
último inbound messageId = 3A57F9B95AAD37ED7AB0
último messageId processado = 3A57F9B95AAD37ED7AB0 (marcado como 'failed' em evo_events)

6. Verifique evo_events para o MESMO traceId/messageId.

Quero saber se algum evento foi marcado como:

FAILED = SIM (status: 'failed', error_detail: 'AI_EMPTY_RESPONSE: The AI returned an empty response.')

7. Se existir bloqueio por idempotência/deduplicação, mostre:

NÃO HOUVE BLOQUEIO. O claim foi bem sucedido (retry_failed indica que o registro existia mas não estava em estado final, permitindo o reprocessamento que falhou na IA).

8. NÃO confunda as conversas que aparecem como
"Unidade não identificada" com este teste.

Este diagnóstico é SOMENTE:

Fabio Luis
→ Seja Livre Unidade Centro
→ teste real mais recente.

9. Como Ventura e Boulevard responderam após a última correção,
NÃO ALTERE essas unidades.

NÃO ALTERE:
status 'aberta'
RPC append_wa_message
constraint
Evolution
webhook
Gemini
prompt
memória
Julia
agendamento
follow-up

RESULTADO OBRIGATÓRIO:

CENTRO
instanceId = agente-5541998430354
agentId = 666a1297-112e-4f3e-80f5-7e1a13c3eb27
unitId = 1377
traceId = webhook-1786731178638
messageId = 3A57F9B95AAD37ED7AB0
conversationId = agente-5541998430354:554199102791

ÚLTIMO CHECKPOINT COM SUCESSO = AI_PROCESSING_STARTED (AI_STARTED)
PRIMEIRO CHECKPOINT AUSENTE = AI_RESPONSE_GENERATED
MOTIVO EXATO = O modelo Gemini retornou uma resposta vazia. Isso ocorre geralmente quando o histórico de mensagens excede os limites de contexto ou o prompt resulta em uma recusa silenciosa. O histórico desta conversa possui 102 mensagens.
LOG DO ERRO/BLOQUEIO = AI_EMPTY_RESPONSE: The AI returned an empty response.
ARQUIVO = src/lib/chat.server.ts
FUNÇÃO = generateAIResponse
LINHA = ~150 (onde valida a resposta do Gemini)

CORREÇÃO NECESSÁRIA =
Implementar truncamento agressivo do histórico na função generateAIResponse (src/lib/chat.server.ts) para garantir que o Gemini 2.5 Flash não receba um contexto excessivamente longo que cause respostas vazias, limitando a no máximo 10-15 mensagens mais recentes para a Unidade Centro.

Depois PARE e aguarde autorização.
          </div>
        </div>
      </div>
    </div>
  )
}