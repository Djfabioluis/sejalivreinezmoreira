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
            Execute esta instrucao no projeto: PARE TODAS AS ALTERAÇÕES.

Acabei de realizar NOVOS TESTES REAIS via WhatsApp nas 3 unidades:

- CENTRO
- VENTURA
- BOULEVARD

NÃO altere absolutamente nada agora.

Não altere:
- código
- prompt
- Gemini
- memória
- history
- limite de 12 mensagens
- bookingContext
- agendamento
- Evolution
- webhook
- banco
- RPC
- constraints
- status
- workers
- agentes
- instâncias

Quero SOMENTE AUDITORIA dos 3 testes que acabei de realizar.

==================================================
1. LOCALIZE OS 3 TESTES REAIS
==================================================

Use os timestamps mais recentes e encontre a mensagem inbound mais recente de cada unidade.

NÃO use testes antigos.
NÃO use simulador.
NÃO use mensagens enviadas por cURL.
NÃO considere status "Conectado" como prova.

Para cada teste mostre:

UNIDADE
timestamp
telefone/remoteJid
messageId
traceId
conversationId
instanceId
instanceName
agentId
unitId

==================================================
2. TRILHA COMPLETA DE CADA TESTE
==================================================

Para o MESMO traceId, procure na ordem:

WEBHOOK_RAW_RECEIVED
→ INSTANCE_RESOLVED
→ AGENT_RESOLVED
→ UNIT_RESOLVED
→ MESSAGE_PERSISTED
→ AI_PROCESSING_STARTED
→ GEMINI_REQUEST_STARTED
→ GEMINI_REQUEST_COMPLETED
→ AI_RESPONSE_GENERATED
→ EVOLUTION_SEND_SUCCESS

Se o sistema atualmente utilizar nomes equivalentes como:

AI_RESPONSE_RECEIVED
EVOLUTION_SEND_COMPLETED

mostre também o nome REAL registrado no log.

NÃO marque checkpoint como concluído sem evento real correspondente.

Se parar em algum ponto, informe:

último checkpoint real =
próximo checkpoint ausente =
timestamp =
erro completo =
arquivo/função se disponível =

==================================================
3. AUDITORIA DO CONTEXTO GEMINI
==================================================

Para cada unidade mostre:

mensagens existentes no banco =
mensagens enviadas ao Gemini =
limite aplicado =
tokens aproximados =
Gemini HTTP status =
finishReason =
response text length =

Quero confirmar que o limite de contexto não está interferindo no isolamento das unidades.

==================================================
4. AUDITORIA DA EVOLUTION
==================================================

Para cada unidade que gerou resposta:

instanceId usado no envio =
instanceName =
destinatário =
HTTP status =
messageId retornado pela Evolution =
quantidade de envios para a mesma mensagem inbound =

IMPORTANTE:

Deve existir EXATAMENTE 1 envio de resposta por mensagem inbound.

Se houver:
0 = FALHA
1 = SUCESSO
2 ou mais = DUPLICIDADE

==================================================
5. PROCURE ERROS PARALELOS
==================================================

No intervalo de tempo dos três testes procure também:

INBOUND_INSTANCE_NOT_RESOLVED
AI_REPLY_HISTORY_PERSISTENCE_FAILED
wa_conversas_status_check
append_wa_message
Could not find the function
Gemini error
EVOLUTION_SEND_FAILED
duplicate
idempotency
schema cache

Associe qualquer ocorrência ao traceId correto.

==================================================
6. RESULTADO FINAL
==================================================

Produza esta tabela:

UNIDADE | timestamp | instanceId | agentId | unitId | traceId | mensagens banco | mensagens Gemini | Gemini status | resposta gerada | Evolution send | nº de envios | último checkpoint | erro

CENTRO |
VENTURA |
BOULEVARD |

Depois uma segunda tabela:

CHECKPOINT | CENTRO | VENTURA | BOULEVARD

WEBHOOK_RAW_RECEIVED
INSTANCE_RESOLVED
AGENT_RESOLVED
UNIT_RESOLVED
MESSAGE_PERSISTED
AI_PROCESSING_STARTED
GEMINI_REQUEST_STARTED
GEMINI_REQUEST_COMPLETED
AI_RESPONSE_GENERATED
EVOLUTION_SEND_SUCCESS

Use:
✅ encontrado
❌ não encontrado

==================================================
CRITÉRIO FINAL
==================================================

Uma unidade somente será considerada FUNCIONANDO se o teste REAL apresentar no mesmo fluxo:

mensagem inbound real
+
instância correta
+
agentId correto
+
unitId correto
+
AI_RESPONSE_GENERATED
+
EVOLUTION_SEND_SUCCESS
+
EXATAMENTE 1 resposta enviada

Não diga "as três estão funcionando" sem provar esses critérios individualmente.

Se alguma falhar, NÃO CORRIJA.

Apenas identifique exatamente a causa e o ponto onde a trilha parou.

Ao terminar a auditoria, PARE e aguarde autorização.
          </div>
        </div>
      </div>
    </div>
  )
}
