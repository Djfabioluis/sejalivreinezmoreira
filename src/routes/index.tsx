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
            Execute esta instrucao no projeto: NÃO ALTERE NADA AGORA.

Resultado dos testes REAIS após a correção:

VENTURA = respondeu corretamente
BOULEVARD = respondeu corretamente
CENTRO = recebeu a mensagem, mas NÃO respondeu

Portanto:
- NÃO reverta a mudança status 'novo' → 'aberta'
- NÃO altere Ventura
- NÃO altere Boulevard
- NÃO altere prompt/Gemini/agendamento
- NÃO mexa novamente na constraint

Quero diagnosticar SOMENTE o teste mais recente da unidade CENTRO.

1. Localize a mensagem real do Centro pelo horário atual.

Mostre a trilha:

WEBHOOK_RAW_RECEIVED
→ INSTANCE_RESOLVED
→ AGENT_RESOLVED
→ UNIT_RESOLVED
→ MESSAGE_PERSISTED
→ AI_PROCESSING_STARTED
→ AI_RESPONSE_GENERATED
→ OUTBOUND_MESSAGE_READY
→ EVOLUTION_SEND_STARTED
→ EVOLUTION_SEND_SUCCESS

Para cada checkpoint:
timestamp
traceId
messageId
resultado

2. Mostre os identificadores do Centro:

instanceId inbound
instanceName
agentId
unitId
conversationId
customerPhone
attendanceMode
status da conversa

3. Compare com UMA mensagem real de Ventura e UMA de Boulevard que acabaram de responder.

Tabela:

CAMPO | CENTRO | VENTURA | BOULEVARD

instanceId inbound
agentId
unitId
status conversa
attendanceMode
MESSAGE_PERSISTED
AI_PROCESSING_STARTED
AI_RESPONSE_GENERATED
outbound instanceId
EVOLUTION_SEND_SUCCESS
messageId Evolution

4. Se o Centro chegar a AI_RESPONSE_GENERATED mas não EVOLUTION_SEND_SUCCESS:

mostrar:
outbound instanceId
endpoint Evolution
HTTP status
response body
erro exato

5. Se o Centro NÃO chegar a AI_PROCESSING_STARTED:

mostrar exatamente qual condição bloqueou:

- HUMAN_MODE
- IA desativada
- lock
- deduplicação
- status da conversa
- evento já processado
- agent/unit resolver
- outro

Não inferir. Mostrar o log.

6. Especialmente verificar se a conversa do Centro já existia com algum estado legado:

status
attendance_mode
human_takeover
ai_paused
lock
last_processed_message_id

Não alterar esses dados ainda.

7. NÃO faça correção automática.

Quero apenas:

ÚLTIMO CHECKPOINT REAL DO CENTRO =
PRÓXIMO CHECKPOINT AUSENTE =
ERRO/CONDIÇÃO EXATA =
ARQUIVO/FUNÇÃO RESPONSÁVEL =

E a comparação com Ventura/Boulevard que estão funcionando.

Depois PARE.
          </div>
        </div>
      </div>
    </div>
  )
}