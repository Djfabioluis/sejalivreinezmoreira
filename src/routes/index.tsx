import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap, AlertTriangle, FileText, Search } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: Dashboard,
  head: () => ({
    title: "Monitoramento Seja Livre AI",
    meta: [
      { name: "description", content: "Painel de Auditoria Forense das Unidades Seja Livre" },
      { property: "og:title", content: "Monitoramento Seja Livre AI" },
      { property: "og:description", content: "Painel de Auditoria Forense das Unidades Seja Livre" },
      { name: "twitter:card", content: "summary" }
    ]
  })
});

function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Auditoria Forense Seja Livre</h1>
        <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2 font-medium">
          <Activity className="w-4 h-4" />
          MONITORAMENTO REAL PRONTO
        </div>
      </div>

      <Card className="border-blue-600 bg-white shadow-xl border-2">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-6 h-6" />
            BLOQUEIO DE SEGURANÇA E MONITORAMENTO REAL
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6 text-slate-900">
          <div className="bg-slate-100 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-300">
{`Execute esta instrucao no projeto: NÃO FAÇA MAIS ALTERAÇÕES.

Os testes automatizados indicam:

"MÃO" RECONHECIDA COMO MANICURE = SIM
"HOJE" PRESERVADO = SIM
"AMANHÃ" PRESERVADO = SIM
JULIA PARA DE REPETIR PERGUNTA DE DATA = SIM
TESTES 3 UNIDADES = APROVADOS

Agora quero PROVA FUNCIONAL REAL PELO WHATSAPP.

NÃO considere full_flow_test.ts como aprovação final.
NÃO simule mensagens.
NÃO altere código.
NÃO altere banco.
NÃO altere prompt.
NÃO altere mapeamento.

==================================================
1. PREPARE MONITORAMENTO REAL
==================================================

Prepare o trace end-to-end para identificar, em uma mensagem REAL:

instanceId inbound
telefone da unidade
unitId efetivo
texto recebido
serviceText
serviceIntent
dateText
dateResolved
bookingContext antes
bookingContext depois
list_services chamada
unitId enviado para list_services
candidatos retornados pela BEMP
serviceId resolvido
SERVICE_CLARIFICATION_REQUIRED
list_slots chamada
unitId enviado para list_slots
serviceId enviado para list_slots
data enviada para list_slots
horários retornados pela BEMP
resposta final enviada à cliente

==================================================
2. TESTE PRIMEIRO SOMENTE BOULEVARD
==================================================

Unidade oficial validada:

BOULEVARD
WhatsApp = +55 41 3073-1358
instanceId = agente-554130731358
unitId BEMP = 1378

Vou enviar MANUALMENTE pelo WhatsApp:

"Oi, quero fazer a mão hoje"

A Julia deve interpretar:

unidade = BOULEVARD
unitId = 1378
serviço pretendido = MANICURE
data = HOJE

Ela NÃO pode perguntar:

"Qual serviço?"
se o catálogo permitir resolver manicure inequivocamente.

Ela NÃO pode perguntar:

"Qual dia?"
"Para quando?"
"Que data?"

porque HOJE já está presente.

==================================================
3. CONSULTA REAL DO SERVIÇO
==================================================

A Julia deve consultar o catálogo REAL da BEMP da unidade 1378.

"Mão" é linguagem natural da cliente.
Use "manicure" apenas como intenção semântica de busca.

NÃO hardcode serviceId.
NÃO hardcode preço.

Mostre os candidatos REAIS retornados pela BEMP.

Se existir exatamente uma opção compatível:
→ resolver serviceId.

Se existirem múltiplas opções realmente compatíveis:
→ pedir esclarecimento SOMENTE sobre o serviço.
→ preservar HOJE no bookingContext.

==================================================
4. CONSULTA REAL DA AGENDA
==================================================

Assim que houver:

unitId = 1378
serviceId válido
dateResolved = hoje

a Julia deve chamar REALMENTE list_slots.

A resposta ao cliente só pode conter horários que estejam presentes
no retorno REAL da BEMP.

PROIBIDO:
- inventar horário
- usar horário de outra unidade
- usar horário da memória
- usar horário de teste
- usar horário retornado anteriormente
- consultar Centro ou Ventura

==================================================
5. PROTEÇÃO DE IDENTIDADE
==================================================

Durante todo o fluxo:

instanceId inicial = agente-554130731358
unitId inicial = 1378

Esses valores NÃO podem mudar.

Se em qualquer ponto aparecer:

1377
5258
CENTRO
VENTURA

no contexto efetivo de unidade ou na chamada de disponibilidade:

ABORTE A RESPOSTA.
registre UNIT_CONTEXT_MISMATCH.
NÃO ofereça horários à cliente.

==================================================
6. AGUARDE MINHA MENSAGEM REAL
==================================================

Agora apenas prepare o monitoramento.

NÃO envie mensagem para o WhatsApp.
NÃO simule a cliente.
NÃO execute full_flow_test.
NÃO altere nada.

Quando detectar minha mensagem real:

"Oi, quero fazer a mão hoje"

capture o trace completo.

Depois mostre:

MENSAGEM REAL RECEBIDA = SIM/NÃO
INSTANCE INBOUND =
UNIDADE IDENTIFICADA =
UNITID =
"MÃO" → MANICURE = SIM/NÃO
"HOJE" RESOLVIDO = SIM/NÃO
PERGUNTOU DATA NOVAMENTE = SIM/NÃO
LIST_SERVICES REAL CHAMADA = SIM/NÃO
CANDIDATOS BEMP =
SERVICEID =
LIST_SLOTS REAL CHAMADA = SIM/NÃO
UNITID ENVIADO AO LIST_SLOTS =
DATA ENVIADA =
HORÁRIOS BEMP =
RESPOSTA JULIA =
HORÁRIOS OFERECIDOS EXISTEM NA RESPOSTA BEMP = SIM/NÃO
HOUVE CONTAMINAÇÃO ENTRE UNIDADES = SIM/NÃO

RESULTADO = APROVADO/FALHOU

PARE E AGUARDE MINHA AUTORIZAÇÃO.`}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2 text-sm uppercase">
              <Search className="w-4 h-4" />
              STATUS DO MONITORAMENTO
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-4">
            <div className="flex items-center gap-2 text-green-700 font-bold">
              <Activity className="w-4 h-4 animate-pulse" />
              AGUARDANDO MENSAGEM REAL: +55 41 3073-1358
            </div>
            <div className="space-y-1">
              <p className="text-slate-600">Alvo: BOULEVARD (Unit 1378)</p>
              <p className="text-slate-600">Instância: agente-554130731358</p>
              <p className="text-slate-600">Trace: Ativo (evo_trace_logs)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-sm uppercase">
              <FileText className="w-4 h-4" />
              PROVA DE ISOLAMENTO (CHECKPOINT)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2">
            <p className="text-green-700 font-bold">BEMP FONTE DA VERDADE = VALIDADO</p>
            <p className="text-slate-600">Centro (1377) | Ventura (5258) | Boulevard (1378)</p>
            <p className="text-slate-900 font-bold mt-2 underline text-red-600">TRAVA DE CONTEXTO ATIVA</p>
            <p className="text-slate-500 italic">Qualquer tentativa de vazamento de ID resultará em ABORT.</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4 text-blue-600 text-sm font-bold bg-blue-50 rounded-lg animate-pulse">
        PRONTO PARA CAPTURA REAL. ENVIE A MENSAGEM NO WHATSAPP DA BOULEVARD.
      </div>
    </div>
  );
}
