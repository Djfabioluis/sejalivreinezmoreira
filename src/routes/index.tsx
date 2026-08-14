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
        Execute esta instrucao no projeto: Acabei de realizar NOVOS testes reais de WhatsApp após a correção
de fallback.server.ts.

Não faça nenhuma alteração agora.

Localize exclusivamente as mensagens que acabei de enviar pelo horário
e pelo conteúdo da mensagem.

Para CENTRO, VENTURA e BOULEVARD, rastreie individualmente:

WEBHOOK_RAW_RECEIVED
→ INSTANCE_RESOLVED
→ AGENT_RESOLVED
→ UNIT_RESOLVED
→ MESSAGE_PERSISTED
→ AI_PROCESSING_STARTED
→ AI_RESPONSE_GENERATED
→ EVOLUTION_SEND_SUCCESS

Mostre uma tabela:

Unidade
| telefone/instanceId
| instanceId técnico Evolution
| agentId
| unitId
| conteúdo recebido
| horário
| último checkpoint
| resposta gerada
| envio Evolution
| erro

IMPORTANTE:

1. Não considere "Conectado" como funcionamento.

2. Não use testes simulados, cURL ou registros antigos.

3. Use SOMENTE os eventos gerados pelas mensagens reais que acabei
de enviar pelo WhatsApp.

4. Verifique também se apareceu novamente qualquer ocorrência de:

Could not find the function public.append_wa_message

AI_REPLY_HISTORY_PERSISTENCE_FAILED

INBOUND_INSTANCE_NOT_RESOLVED

AGENT_NOT_RESOLVED

UNIT_NOT_RESOLVED

EVOLUTION_SEND_FAILED

5. Confirme especificamente se fallback.server.ts deixou de executar
a assinatura antiga de 7 parâmetros.

6. Não altere:
prompt,
Gemini,
memória,
máquina de estados,
agendamento,
regras da Julia,
webhooks,
instâncias.

Primeiro apenas faça o diagnóstico dos três testes.

Se alguma unidade não chegar até EVOLUTION_SEND_SUCCESS,
mostre exatamente o checkpoint onde parou e a mensagem de erro real.

Não responda apenas "está funcionando".
Quero a trilha técnica dos três testes.
      </div>
    </div>
  </div>
</div>
  )
}
