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
            Execute esta instrucao no projeto: PARE AS ALTERAÇÕES.

O diagnóstico agora aponta DOIS problemas potencialmente diferentes:

1. Runtime/schema antigo relacionado a append_wa_message.
2. Boulevard aparentemente falhando na persistência inbound pela constraint
   wa_conversas_status_check.

Antes de corrigir, quero a PROVA FINAL por instância usando os testes reais mais recentes.

NÃO altere:
- prompt
- Gemini
- memória
- agendamento
- regras da Julia
- Evolution
- banco
- constraints
- RPCs
- workers

==================================================
1. IDENTIFIQUE AS 3 INSTÂNCIAS
==================================================

Mostre:

CENTRO
instanceId:
instanceName:
agentId:
unitId:

VENTURA
instanceId:
instanceName:
agentId:
unitId:

BOULEVARD
instanceId:
instanceName:
agentId:
unitId:

Não use apenas telefone ou nome visual para resolver a instância.

==================================================
2. ÚLTIMO TESTE REAL DE CADA UNIDADE
==================================================

Localize pelo timestamp os testes reais mais recentes.

Para cada mensagem, apresente a trilha:

WEBHOOK_RAW_RECEIVED
↓
INSTANCE_RESOLVED
↓
AGENT_RESOLVED
↓
UNIT_RESOLVED
↓
MESSAGE_PERSISTED
↓
AI_PROCESSING_STARTED
↓
AI_RESPONSE_GENERATED
↓
EVOLUTION_SEND_ATTEMPT
↓
EVOLUTION_SEND_SUCCESS

Não deduza checkpoints.

Somente marque SIM quando existir evento real no log.

Tabela obrigatória:

checkpoint | Centro | Ventura | Boulevard

Para evento inexistente:
AUSENTE

Para evento com erro:
ERRO + mensagem original do erro.

==================================================
3. BOULEVARD — AUDITAR wa_conversas_status_check
==================================================

Você informou:

"Especial Boulevard: O teste falha na persistência da mensagem
de entrada devido à constraint wa_conversas_status_check."

Agora prove isso.

Mostre o INSERT/UPDATE que falhou.

Quero ver:

table
status enviado
phone
instanceId
agentId
unitId
timestamp
traceId
messageId
PostgreSQL error code
mensagem completa do erro

Depois consulte a definição REAL da constraint:

wa_conversas_status_check

Mostre quais valores de status ela permite.

Depois compare:

STATUS QUE O CÓDIGO TENTOU GRAVAR
versus
STATUS PERMITIDOS PELA CONSTRAINT.

NÃO ALTERE A CONSTRAINT.

==================================================
4. VENTURA
==================================================

A tela mostra mensagem recente identificada como:

Seja Livre Ventura Shopping

Portanto o inbound aparentemente está chegando.

Localize especificamente esse teste.

Quero saber exatamente até onde chegou.

Se MESSAGE_PERSISTED = SIM e AI_PROCESSING_STARTED = NÃO,
localize o bloqueio entre esses dois pontos.

Se AI_RESPONSE_GENERATED = SIM e EVOLUTION_SEND_SUCCESS = NÃO,
mostre o erro do envio.

Não associe automaticamente o problema de Ventura ao problema
do Boulevard.

==================================================
5. append_wa_message
==================================================

Não aceite mais a explicação genérica "cache antigo".

Mostre o erro real mais recente contendo:

Could not find the function public.append_wa_message

e apresente:

timestamp
traceId
instanceId
agentId
unitId
runtime/function
parâmetros enviados

Depois diga se esse erro pertenceu a:

Centro
Ventura
Boulevard
Follow-up
Recovery
outro worker

Quero identificar QUAL PROCESSO ainda gera a chamada antiga.

==================================================
6. NÃO CONFUNDIR DOIS TIPOS DE PERSISTÊNCIA
==================================================

Separe claramente:

A) persistência da MENSAGEM RECEBIDA do WhatsApp

B) persistência da RESPOSTA/HISTÓRICO da IA

O erro append_wa_message pode ocorrer em uma etapa diferente
da constraint wa_conversas_status_check.

Não trate os dois como se fossem o mesmo erro.

==================================================
7. RESULTADO FINAL
==================================================

Apresente exatamente:

UNIDADE | instanceId | agentId | unitId | último checkpoint real | erro real | cliente recebeu resposta?

Depois:

Centro:
CAUSA/STATUS =

Ventura:
CAUSA/STATUS =

Boulevard:
CAUSA/STATUS =

E finalmente:

CAUSA RAIZ 1 =
unidades afetadas =

CAUSA RAIZ 2 =
unidades afetadas =

Não faça nenhuma correção.

Quero primeiro confirmar a cadeia real de execução das três
instâncias antes de autorizar qualquer alteração.
          </div>
        </div>
      </div>
    </div>
  )
}