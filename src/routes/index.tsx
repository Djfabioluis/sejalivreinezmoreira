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
        Execute esta instrucao no projeto: Acabei de enviar 3 NOVAS mensagens REAIS pelo WhatsApp,
uma para cada instância.

NÃO ALTERE NADA.

Não faça correção.
Não faça redeploy.
Não altere RPC.
Não altere webhook.
Não altere IA.

Agora apenas AUDITE os logs produzidos por esses 3 testes.

Localize cada mensagem pelo conteúdo e horário atual.

Para cada unidade:

CENTRO
VENTURA
BOULEVARD

mostre a trilha REAL:

WEBHOOK_RAW_RECEIVED
→ INSTANCE_RESOLVED
→ AGENT_RESOLVED
→ UNIT_RESOLVED
→ MESSAGE_PERSISTED
→ AI_PROCESSING_STARTED
→ AI_RESPONSE_GENERATED
→ EVOLUTION_SEND_SUCCESS

Quero esta tabela:

Unidade
| conteúdo recebido
| timestamp
| instanceId Evolution
| agentId
| unitId
| MESSAGE_PERSISTED
| AI_PROCESSING_STARTED
| AI_RESPONSE_GENERATED
| resposta gerada
| outbound instanceId
| EVOLUTION_SEND_SUCCESS
| messageId Evolution
| último checkpoint
| erro

Também procure nesses mesmos testes por:

Could not find the function public.append_wa_message

AI_REPLY_HISTORY_PERSISTENCE_FAILED

INBOUND_INSTANCE_NOT_RESOLVED

AGENT_NOT_RESOLVED

UNIT_NOT_RESOLVED

AI_PROCESSING_FAILED

AI_RESPONSE_FAILED

EVOLUTION_SEND_FAILED

DUPLICATE_MESSAGE

Não use registros antigos.

Não use simulação.

Não use cURL.

Não considere status "Conectado" como prova.

Não considere a mensagem aparecer na Caixa de Entrada como
prova de que a IA respondeu.

A prova de funcionamento é:

mensagem REAL recebida
+
instância correta resolvida
+
IA processada
+
resposta gerada
+
EVOLUTION_SEND_SUCCESS
+
messageId retornado pela Evolution.

IMPORTANTE:

Confirme também que a resposta saiu pela MESMA instância/unidade
que recebeu a mensagem.

Centro → Centro
Ventura → Ventura
Boulevard → Boulevard

Não faça nenhuma alteração mesmo que encontre erro.

Se algum teste parar no meio, informe:

ÚLTIMO CHECKPOINT EXECUTADO
PRÓXIMO CHECKPOINT NÃO EXECUTADO
ERRO EXATO
ARQUIVO/FUNÇÃO RESPONSÁVEL

Quero primeiro o diagnóstico pós-correção do schema cache.
      </div>
    </div>
  </div>
</div>
  )
}