import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: NÃO FAÇA MAIS NENHUMA ALTERAÇÃO.

A correção automatizada indica:

serviceId preservado = OK
mensagem "quero para amanhã" = processada
list_slots = CHAMADA
AVAILABILITY_TOOL_CALLED = confirmado

Agora quero PROVA FUNCIONAL REAL pelo WhatsApp.

NÃO altere código.
NÃO corrija automaticamente.
NÃO simule mensagens.
NÃO use teste automatizado como aprovação.

Escolha primeiro UMA unidade para validação controlada.

Preferência:
CENTRO.

Prepare monitoramento do fluxo real:

WhatsApp
→ Evolution
→ webhook
→ bookingContext
→ resolução do serviço
→ resolução da data
→ list_slots
→ API/BEMP
→ slots reais
→ Julia
→ Evolution
→ WhatsApp

Quando estiver pronto, informe SOMENTE:

UNIDADE =
instanceId =
unitId =
NÚMERO DE WHATSAPP QUE DEVO TESTAR =
MONITORAMENTO = PRONTO/NÃO PRONTO

Depois PARE.

Eu enviarei manualmente a conversa.

Durante o teste, não interfira e não altere código.

Quero testar esta sequência real:

MENSAGEM 1:
"Olá, gostaria de agendar um serviço."

Depois seguirei naturalmente a conversa até informar um serviço real.

Quando o serviço estiver definido, verificaremos:

bookingContext.serviceId =
bookingContext.serviceName =
bookingContext.unitId =

Depois enviarei:

"Quero para amanhã."

Nesse momento é OBRIGATÓRIO registrar:

DATE_RESOLVED =
serviceId =
unitId =
AVAILABILITY_TOOL_CALLED =
tool =
request da list_slots =
HTTP status =
response =
quantidade de slots =
slots retornados =

Depois registrar:

RESPOSTA_GERADA_PELA_JULIA =
MENSAGEM_ENVIADA_EVOLUTION =
MENSAGEM_RECEBIDA_WHATSAPP =

REGRA DE APROVAÇÃO:

Só considerar APROVADO se houver evidência real de:

mensagem WhatsApp
→ serviceId preservado
→ data identificada
→ list_slots chamada
→ resposta real da agenda
→ slots reais
→ Julia oferecendo somente horários retornados
→ mensagem enviada pelo Evolution

Se list_slots não for chamada:
FALHOU.

Se serviceId desaparecer:
FALHOU.

Se list_slots retornar horários e Julia apresentar outros:
FALHOU.

Se API retornar zero horários e Julia inventar horário:
FALHOU.

Se Julia informar disponibilidade sem list_slots:
FALHOU.

IMPORTANTE:

Não quero testar as três unidades simultaneamente.

Primeiro CENTRO.

Depois de validarmos CENTRO, faremos VENTURA.
Depois BOULEVARD.

Agora apenas prepare o monitoramento da unidade CENTRO e PARE.`;

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
