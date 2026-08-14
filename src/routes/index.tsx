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
            Execute esta instrucao no projeto: NÃO AUTORIZO CORREÇÃO AINDA.

Você apresentou duas "causas raiz", mas ainda não mostrou as
EVIDÊNCIAS TÉCNICAS solicitadas.

Não quero nova explicação teórica.
Não quero sugestões de correção.
Não quero alterar constraint nem código.

EXECUTE SOMENTE A AUDITORIA ABAIXO.

1. Consulte os logs dos últimos 15 minutos.

Localize as mensagens REAIS recebidas por:

CENTRO
VENTURA
BOULEVARD

Use instanceId/traceId/messageId para correlacionar os eventos.

2. Para cada unidade, imprima os eventos REAIS encontrados, em ordem:

WEBHOOK_RAW_RECEIVED
INSTANCE_RESOLVED
AGENT_RESOLVED
UNIT_RESOLVED
MESSAGE_PERSISTED
AI_PROCESSING_STARTED
AI_RESPONSE_GENERATED
EVOLUTION_SEND_ATTEMPT
EVOLUTION_SEND_SUCCESS

Formato obrigatório:

CENTRO
timestamp:
instanceId:
agentId:
unitId:
traceId:
messageId:

WEBHOOK_RAW_RECEIVED = [timestamp ou AUSENTE]
INSTANCE_RESOLVED = [timestamp ou AUSENTE]
AGENT_RESOLVED = [timestamp ou AUSENTE]
UNIT_RESOLVED = [timestamp ou AUSENTE]
MESSAGE_PERSISTED = [timestamp ou AUSENTE]
AI_PROCESSING_STARTED = [timestamp ou AUSENTE]
AI_RESPONSE_GENERATED = [timestamp ou AUSENTE]
EVOLUTION_SEND_ATTEMPT = [timestamp ou AUSENTE]
EVOLUTION_SEND_SUCCESS = [timestamp ou AUSENTE]

ÚLTIMO CHECKPOINT REAL:
ERRO APÓS O CHECKPOINT:

Repita exatamente para VENTURA e BOULEVARD.

3. STATUS / CONSTRAINT

Você afirmou que Ventura e Boulevard estão sendo bloqueadas por:

wa_conversas_status_check

Agora mostre a evidência REAL.

Execute a consulta necessária para obter a definição atual da constraint.

Mostre:

constraint_name
table_name
constraint_definition

Depois mostre TODOS os valores de status permitidos.

Em seguida localize no log de Ventura e Boulevard:

status que tentou ser gravado
operação SQL/RPC
timestamp
traceId
instanceId
erro PostgreSQL completo
SQLSTATE

Quero esta comparação:

VENTURA
status enviado =
status permitido? SIM/NÃO
erro da constraint =

BOULEVARD
status enviado =
status permitido? SIM/NÃO
erro da constraint =

Se não houver log provando violação da constraint em uma unidade,
NÃO diga que essa unidade é afetada.

4. RPC append_wa_message

Localize a ocorrência MAIS RECENTE do erro da assinatura de
7 parâmetros.

Mostre:

timestamp
traceId
messageId
instanceId
agentId
unitId
nome da função/worker que executou
runtime/deployment
parâmetros enviados
erro completo

Depois responda objetivamente:

A chamada de 7 parâmetros ocorreu no fluxo de:
[ ] mensagem inbound
[ ] resposta da IA
[ ] follow-up
[ ] recovery
[ ] outro

Identifique qual.

5. IMPORTANTE

Não use frases como:

"provavelmente"
"aparentemente"
"potencialmente"
"deve ser"
"pode ser"

Se não existir evidência no log, escreva:

NÃO COMPROVADO.

6. RESULTADO FINAL

Produza UMA tabela:

UNIDADE | instanceId | agentId | unitId | traceId | último checkpoint REAL | erro REAL | EVOLUTION_SEND_SUCCESS

Centro |
Ventura |
Boulevard |

E uma segunda tabela:

PROBLEMA | Centro | Ventura | Boulevard | EVIDÊNCIA

wa_conversas_status_check |
append_wa_message 7 parâmetros |

Somente depois das tabelas informe:

CAUSA COMPROVADA DO CENTRO:
CAUSA COMPROVADA DO VENTURA:
CAUSA COMPROVADA DO BOULEVARD:

Não faça nenhuma alteração.
Não sincronize constraint.
Não altere RPC.
Não reinicie worker.
Não faça deploy.
Não altere banco.
Não altere prompt/Gemini/Julia/agendamento.

AUDITORIA SOMENTE.
          </div>
        </div>
      </div>
    </div>
  )
}