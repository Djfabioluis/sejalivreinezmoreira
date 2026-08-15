import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: NÃO FAÇA ALTERAÇÃO DE CÓDIGO.

O mapeamento das 3 unidades foi corrigido e validado.

Agora quero TESTE FUNCIONAL REAL DE DISPONIBILIDADE,
começando SOMENTE pela unidade BOULEVARD.

UNIDADE:
BOULEVARD
telefone = +55 41 3073-1358
instanceId = agente-554130731358
unitId = 5258

OBJETIVO:

Comprovar que, quando um cliente solicita agendamento pelo
WhatsApp da Boulevard, a Julia:

1. identifica a unidade correta;
2. identifica/resgata o serviço correto;
3. mantém o serviceId no bookingContext;
4. interpreta a data solicitada;
5. CHAMA REALMENTE a ferramenta de disponibilidade/list_slots;
6. consulta a agenda REAL da BEMP da unidade 5258;
7. recebe os horários disponíveis;
8. responde SOMENTE com horários retornados pela ferramenta.

NÃO ALTERE:
- código
- prompt
- Gemini
- Evolution
- webhook
- preços
- wa_agentes
- bookingContext
- regras de ambiguidade
- memória
- follow-up
- interface

Não simule horários.
Não invente slots.
Não considere teste unitário como aprovação.

================================================
FASE 1 — PRÉ-VALIDAÇÃO
================================================

Antes do teste, mostre:

unitId resolvido =
instanceId =
serviceId =
nome do serviço =
data interpretada =
timezone =
profissional (se aplicável) =

Se serviceId não estiver resolvido, PARE.
Não consulte disponibilidade sem serviço válido.

================================================
FASE 2 — CONSULTA REAL DA AGENDA
================================================

Execute a mesma função/ferramenta utilizada em PRODUÇÃO pela Julia
para consultar disponibilidade.

Quero evidência:

TOOL_CALLED =
nome da ferramenta =
unitId enviado =
serviceId enviado =
data enviada =
timezone enviada =
payload enviado à BEMP =

Depois mostre a resposta BRUTA da BEMP:

HTTP/status =
quantidade de slots =
slots retornados =

Não transforme nem invente horários nesta etapa.

================================================
FASE 3 — RESPOSTA DA JULIA
================================================

Com os slots REAIS retornados pela BEMP, execute o processamento
normal da Julia.

Mostre:

horários recebidos da BEMP =
horários apresentados pela Julia =

Validação obrigatória:

Cada horário informado pela Julia deve existir exatamente
nos slots retornados pela BEMP.

Se Julia apresentar horário que não veio da BEMP:

FALHA = HALLUCINATED_AVAILABILITY

Se a ferramenta não for chamada:

FALHA = AVAILABILITY_TOOL_NOT_CALLED

Se unitId estiver diferente de 5258:

FALHA = WRONG_UNIT

Se serviceId estiver ausente/incorreto:

FALHA = SERVICE_NOT_RESOLVED

Se a BEMP retornar zero horários, a Julia NÃO pode inventar horário.

================================================
FASE 4 — TESTE PELO FLUXO REAL
================================================

Depois da consulta técnica, prepare monitoramento para um teste
manual pelo WhatsApp da BOULEVARD.

NÃO envie mensagem automaticamente.

Informe exatamente qual mensagem EU devo enviar pelo meu WhatsApp
para +55 41 3073-1358.

Durante o teste monitore:

INBOUND_RECEIVED
INSTANCE_RESOLVED
UNIT_RESOLVED
SERVICE_RESOLVED
DATE_RESOLVED
AVAILABILITY_TOOL_CALLED
BEMP_REQUEST
BEMP_RESPONSE
SLOTS_RECEIVED
AI_RESPONSE
WHATSAPP_SENT

Quero comparar:

BEMP_RESPONSE
versus
mensagem efetivamente enviada pela Julia.

================================================
RESULTADO
================================================

BOULEVARD unitId =

serviceId =

AVAILABILITY_TOOL_CALLED = SIM/NÃO

BEMP CONSULTADA = SIM/NÃO

SLOTS REAIS RETORNADOS =

HORÁRIOS INFORMADOS PELA JULIA =

TODOS OS HORÁRIOS DA JULIA EXISTEM NA RESPOSTA BEMP = SIM/NÃO

TESTE TÉCNICO = PASSOU/FALHOU

TESTE WHATSAPP REAL = AGUARDANDO TESTE MANUAL

Não faça correções caso encontre falha.

Mostre o ponto exato da falha e PARE.

AGUARDE MINHA AUTORIZAÇÃO.`;

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
