import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: NÃO FAÇA ALTERAÇÃO AINDA.

PROBLEMA REAL:
A Julia não está verificando os horários disponíveis na agenda antes
de responder ao cliente.

Quero DIAGNÓSTICO FORENSE do último atendimento real em que o cliente
pediu um horário/data e a Julia não consultou corretamente a agenda.

NÃO altere:
- prompt
- Gemini
- preços
- SERVICE_PRICE_RESOLVED
- regras de ambiguidade
- Evolution
- webhook
- memória
- histórico
- follow-up

==================================================
1. LOCALIZE UM CASO REAL
==================================================

Localize a conversa real mais recente em que o cliente informou:

- serviço
e
- data/dia desejado

e a Julia deveria consultar disponibilidade.

Mostre:

timestamp
traceId
conversationId
instanceId
agentId
unitId
texto do cliente
serviço resolvido
serviceId
data solicitada
profissional, se informado

==================================================
2. IDENTIFIQUE A FERRAMENTA DE DISPONIBILIDADE
==================================================

Mostre exatamente qual função/tool é responsável por consultar
horários disponíveis.

Informe:

arquivo =
função =
tool name =
endpoint/API =
fonte = BEMP ou outra

Quero saber qual chamada deveria acontecer depois que houver:

unitId
+
serviceId
+
data

==================================================
3. TRILHA REAL
==================================================

Para o mesmo traceId mostre:

SERVICE_RESOLVED =
DATE_RESOLVED =
PROFESSIONAL_RESOLVED =
AVAILABILITY_CHECK_STARTED =
AVAILABILITY_API_REQUEST =
AVAILABILITY_API_RESPONSE =
AVAILABLE_SLOTS_RESOLVED =
AI_RESPONSE_GENERATED =
EVOLUTION_SEND_SUCCESS =

Use:
SIM/NÃO
timestamp
resultado

Se algum checkpoint não existir:
marque AUSENTE.

==================================================
4. SE A CONSULTA NÃO FOI CHAMADA
==================================================

Se AVAILABILITY_CHECK_STARTED = AUSENTE:

mostre a condição EXATA que impediu a chamada.

Verifique:

- serviceId ausente
- unitId ausente
- data não normalizada
- bookingContext incorreto
- profissional obrigatório indevidamente
- estado da máquina de agendamento errado
- ferramenta não selecionada
- regra dizendo que a IA pode responder sem consultar agenda
- outro bloqueio

Mostre:
arquivo
função
linha
condição

==================================================
5. SE A CONSULTA FOI CHAMADA
==================================================

Se a API de disponibilidade foi chamada, mostre:

unitId enviado
serviceId enviado
professionalId enviado
data inicial
data final
timezone
payload completo técnico
HTTP status
response body resumido
quantidade de horários retornados

Depois mostre os horários reais retornados.

Não invente horários para completar resposta.

==================================================
6. VALIDE A UNIDADE
==================================================

A consulta de agenda deve respeitar obrigatoriamente a instância:

CENTRO → agenda da unidade Centro
VENTURA → agenda da unidade Ventura
BOULEVARD → agenda da unidade Boulevard

Compare:

inbound instanceId
unitId resolvido
unitId usado na consulta de disponibilidade

Eles precisam corresponder.

==================================================
7. REGRA OBRIGATÓRIA
==================================================

A Julia NÃO pode responder:

"temos horário"
"tem disponibilidade"
"pode ser às 14h"
"temos amanhã"

sem uma consulta REAL de disponibilidade no mesmo fluxo.

Se não houver resposta válida da agenda:

não inventar horário.

Responder de forma segura informando que vai verificar,
e registrar erro técnico.

==================================================
8. NÃO REPETIR PERGUNTAS
==================================================

Se o cliente já informou:

serviço = manicure
data = amanhã

a Julia NÃO deve perguntar novamente:

"qual serviço?"
ou
"qual dia?"

Ela deve usar o contexto já confirmado e consultar a agenda.

Mostre se isso ocorreu no trace analisado.

==================================================
9. RESULTADO FINAL
==================================================

Entregue:

UNIDADE =
traceId =
serviceId =
data =
professionalId =
ferramenta de disponibilidade =
foi chamada? SIM/NÃO =
unitId enviado =
HTTP status =
slots retornados =
último checkpoint =
erro/bloqueio =

Depois classifique:

[A] ferramenta não foi chamada
[B] chamada com unitId errado
[C] chamada com serviceId errado
[D] data enviada errada
[E] API retornou erro
[F] API retornou slots mas Julia ignorou
[G] bookingContext perdeu serviço/data
[H] outra causa comprovada

NÃO CORRIJA AINDA.

PARE e aguarde autorização.`;

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
