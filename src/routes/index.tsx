import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: URGENTE — NOVA EVIDÊNCIA REAL DE PRODUÇÃO.

NÃO FAÇA NENHUMA ALTERAÇÃO.

Além do problema já reportado:

VENTURA -> Julia ofereceu horários do CENTRO

agora ocorreu OUTRO ERRO REAL:

BOULEVARD -> a IA se identificou para o cliente como unidade VENTURA.

Portanto, NÃO trate mais este problema apenas como erro de list_slots.

Temos evidência de CONTAMINAÇÃO/RESOLUÇÃO INCORRETA DE UNIDADE
em diferentes pontos do fluxo.

MAPEAMENTO CORRETO JÁ VALIDADO:

CENTRO
telefone = +55 41 99843-0354
instanceId = agente-5541998430354
unitId = 1378

VENTURA
telefone = +55 41 99880-3684
instanceId = agente-5541998803684
unitId = 1377

BOULEVARD
telefone = +55 41 3073-1358
instanceId = agente-554130731358
unitId = 5258

==================================================
NOVA PRIORIDADE: CASO REAL BOULEVARD
==================================================

Localize IMEDIATAMENTE nos logs o atendimento real mais recente
da instância:

agente-554130731358

em que a IA se identificou como VENTURA.

Não use teste simulado.
Não use apenas bookingContext criado artificialmente.
Quero o trace REAL do webhook até a resposta enviada ao WhatsApp.

==================================================
1. TRACE DA IDENTIDADE DA UNIDADE
==================================================

Mostre cronologicamente:

WEBHOOK RECEBIDO
instanceId =
instanceName =
telefone da instância =

WA_AGENT LOOKUP
registro encontrado =
unidade_id =

UNIDADE RESOLVIDA NO BANCO
unitId =
nome da unidade =

BOOKING CONTEXT CRIADO
conversationId =
unitId =
unitName =
instanceId =

CONTEXTO ENVIADO PARA IA
unitId =
unitName =
nome da unidade informado ao modelo =

RESPOSTA GERADA PELA IA
texto exato da identificação da unidade =

WHATSAPP OUTBOUND
instanceId usada para envio =
telefone/instância de saída =

==================================================
2. DESCUBRA ONDE BOULEVARD VIROU VENTURA
==================================================

O valor correto esperado é:

instanceId agente-554130731358
-> unitId 5258
-> BOULEVARD

Procure o PRIMEIRO ponto do trace onde aparece:

1377
VENTURA
ou qualquer identificador pertencente ao Ventura.

Mostre:

ÚLTIMO ESTADO CORRETO:
arquivo =
função =
valor =

PRIMEIRO ESTADO INCORRETO:
arquivo =
função =
linha =
valor =

ORIGEM DO VALOR INCORRETO =

==================================================
3. AUDITE TODAS AS FONTES DE IDENTIDADE
==================================================

Pesquise no código e no runtime por qualquer lugar que determine
ou sobrescreva a unidade:

- wa_agentes.unidade_id
- bookingContext.unitId
- bookingContext.unitName
- instanceId
- instanceName
- agentId
- conversationId
- telefone da instância
- telefone do cliente
- unidade salva na conversa
- unidade salva no CRM
- memória
- histórico
- system prompt dinâmico
- contexto injetado no Gemini
- resolveEffectiveUnit
- fallbacks
- defaults
- cache
- variáveis globais
- session
- local/context store
- recuperação de conversa anterior

Procure especificamente:

"Ventura"
"Centro"
"Boulevard"
1377
1378
5258

Quero saber se existe QUALQUER identificação de unidade
hardcoded ou fallback.

==================================================
4. TESTE CRÍTICO DE ISOLAMENTO
==================================================

SEM enviar mensagens aos clientes e SEM alterar código:

Crie três execuções independentes usando o pipeline real.

ENTRADA CENTRO:
agente-5541998430354

Esperado:
1378 / CENTRO

ENTRADA VENTURA:
agente-5541998803684

Esperado:
1377 / VENTURA

ENTRADA BOULEVARD:
agente-554130731358

Esperado:
5258 / BOULEVARD

Em CADA execução mostre:

INBOUND_INSTANCE
WA_AGENT_UNIT
BOOKING_CONTEXT_UNIT
AI_CONTEXT_UNIT
AI_CONTEXT_UNIT_NAME
OUTBOUND_INSTANCE

Nenhum valor pode mudar durante o pipeline.

==================================================
5. TESTE DE CONTAMINAÇÃO ENTRE CONVERSAS
==================================================

Execute sequencialmente:

A. CENTRO
B. VENTURA
C. BOULEVARD
D. CENTRO novamente
E. BOULEVARD novamente

Use conversations/sessions independentes.

Verifique se a unidade da execução anterior contamina a seguinte.

Depois execute em ordem inversa:

A. BOULEVARD
B. VENTURA
C. CENTRO

Compare os resultados.

==================================================
6. NÃO CORRIJA
==================================================

NÃO altere:
- wa_agentes
- bookingContext
- prompt
- Gemini
- list_slots
- Evolution
- webhook
- memória
- CRM
- banco
- preços
- serviços

Estamos fazendo diagnóstico forense.

==================================================
RESULTADO OBRIGATÓRIO
==================================================

CASO REAL BOULEVARD ENCONTRADO = SIM/NÃO

INBOUND INSTANCE =
UNITID APÓS WA_AGENTES =
UNIDADE APÓS WA_AGENTES =

BOOKING_CONTEXT UNITID =
BOOKING_CONTEXT UNITNAME =

AI CONTEXT UNITID =
AI CONTEXT UNITNAME =

UNIDADE QUE A IA DISSE AO CLIENTE =

OUTBOUND INSTANCE =

BOULEVARD VIROU VENTURA = SIM/NÃO

PONTO EXATO DA TROCA =
arquivo:
função:
linha:

ORIGEM DO 1377/VENTURA =

HÁ CONTAMINAÇÃO ENTRE CONVERSAS = SIM/NÃO

HÁ FALLBACK DE UNIDADE = SIM/NÃO

HÁ UNIDADE HARDCODED = SIM/NÃO

AS 3 INSTÂNCIAS PERMANECEM ISOLADAS DE PONTA A PONTA = SIM/NÃO

CAUSA RAIZ COMPROVADA =

CORREÇÃO MÍNIMA RECOMENDADA =
(descreva, NÃO execute)

NÃO FAÇA CORREÇÃO.

PARE E AGUARDE MINHA AUTORIZAÇÃO.`;


export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Status do Projeto Julia IA</h1>
      <div className="bg-slate-900 text-slate-50 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-800 shadow-xl overflow-auto max-h-[70vh]">
        {instructions}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-100">
          <h2 className="font-semibold text-emerald-900 mb-2">Diagnóstico Concluído</h2>
          <p className="text-emerald-700 text-sm">A causa técnica do erro de preço (alucinação por falha de ferramenta) foi isolada e bloqueada.</p>
        </div>
        <div className="p-4 border rounded-lg bg-blue-50 border-blue-100">
          <h2 className="font-semibold text-blue-900 mb-2">Próxima Etapa</h2>
          <p className="text-blue-700 text-sm">Auditoria forense de disponibilidade e horários da agenda.</p>
        </div>
      </div>
    </div>
  )
}
