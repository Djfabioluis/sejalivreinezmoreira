import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: URGENTE — NÃO FAÇA NENHUMA ALTERAÇÃO.

PROBLEMA REAL EM PRODUÇÃO:

A JULIA ESTÁ OFERECENDO PARA CLIENTES DA UNIDADE VENTURA
HORÁRIOS PERTENCENTES À UNIDADE CENTRO.

Isso significa que a validação anterior NÃO é suficiente para considerar
o isolamento entre unidades aprovado.

DADOS CORRETOS JÁ VALIDADOS:

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

NÃO CORRIJA NADA AINDA.

Quero DIAGNÓSTICO FORENSE de um atendimento REAL recente
recebido pelo WhatsApp da VENTURA em que a Julia consultou/ofereceu
horários.

==================================================
1. LOCALIZE UM CASO REAL DO VENTURA
==================================================

Localize uma conversa real recente originada da instância:

agente-5541998803684

telefone da unidade:
+55 41 99880-3684

Mostre:

conversationId =
telefone do cliente =
instanceId inbound =
unitId obtido de wa_agentes =
unidade resolvida =
bookingContext.unitId =
serviceId =
data solicitada =

Não exponha dados pessoais desnecessários do cliente.

==================================================
2. TRACE O UNITID ATÉ A CONSULTA DA AGENDA
==================================================

Quero acompanhar o valor do unitId em CADA etapa:

INBOUND
instanceId =
unitId =

CONTEXT
bookingContext.unitId =

SERVICE RESOLUTION
unitId usado =
serviceId =

ANTES DE list_slots
unitId esperado = 1377
unitId efetivamente enviado =

REQUEST PARA BEMP
endpoint =
unitId/identificador da unidade enviado =
serviceId =
data =
demais identificadores relevantes =

RESPOSTA BEMP
unidade da resposta =
slots retornados =

RESPOSTA DA JULIA
horários offeredcidos =

==================================================
3. COMPARE VENTURA CONTRA CENTRO
==================================================

Para a MESMA data e serviço do atendimento encontrado,
consulte separadamente, sem enviar mensagens:

VENTURA = unitId 1377
CENTRO = unitId 1378

Mostre:

VENTURA
slots =

CENTRO
slots =

HORÁRIOS QUE A JULIA OFERECEU AO CLIENTE =

Depois determine:

os horários oferecidos correspondem ao VENTURA = SIM/NÃO

os horários oferecidos correspondem ao CENTRO = SIM/NÃO

==================================================
4. PROCURE VAZAMENTO DE CONTEXTO
==================================================

Audite especificamente se existe:

- unitId default/fallback para Centro
- unitId hardcoded 1378
- cache de disponibilidade sem unitId na chave
- bookingContext compartilhado entre conversas
- contexto recuperado pelo telefone errado
- serviceId resolvido em uma unidade e usado em outra
- list_slots ignorando bookingContext.unitId
- função convertendo instanceId para unidade novamente
- fallback selecionando primeira unidade
- estado/memória de conversa anterior contaminando a atual
- resposta de disponibilidade reutilizada entre unidades
- variável global contendo unidade
- consulta BEMP sem filtro efetivo da unidade

Pesquise o fluxo REAL, não apenas testes automatizados.

==================================================
5. REGRA DE SEGURANÇA

NÃO implemente correção.
NÃO mude prompt.
NÃO mude Gemini.
NÃO mude preços.
NÃO altere wa_agentes.
NÃO altere bookingContext.
NÃO altere list_slots ainda.
NÃO envie mensagens para clientes.

==================================================
RESULTADO OBRIGATÓRIO
==================================================

CASO REAL VENTURA ENCONTRADO = SIM/NÃO

INSTANCE INBOUND =
UNITID INBOUND =
BOOKINGCONTEXT UNITID =
UNITID ENVIADO AO LIST_SLOTS =
UNITID/UNIDADE ENVIADO À BEMP =

SLOTS VENTURA =

SLOTS CENTRO =

HORÁRIOS OFERECIDOS PELA JULIA =

HORÁRIOS ERAM DO CENTRO = SIM/NÃO

PONTO EXATO ONDE 1377 VIROU 1378 =
arquivo:
função:
linha:
causa:

OU, se o unitId não mudou:

PONTO EXATO ONDE A CONSULTA IGNOROU A UNIDADE =
arquivo:
função:
linha:
causa:

CLASSIFICAÇÃO DA CAUSA =
[ROTEAMENTO]
[BOOKING_CONTEXT]
[LIST_SLOTS]
[BEMP_REQUEST]
[CACHE]
[MEMÓRIA]
[SERVICE_RESOLUTION]
[OUTRO]

CORREÇÃO RECOMENDADA =
descreva, mas NÃO execute.

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
