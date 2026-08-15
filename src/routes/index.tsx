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
          TESTE FUNCIONAL REAL PRONTO
        </div>
      </div>

      <Card className="border-blue-600 bg-white shadow-xl border-2">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-6 h-6" />
            CORREÇÃO PONTUAL — NORMALIZAÇÃO SEMÂNTICA "MÃO"
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6 text-slate-900">
          <div className="bg-slate-100 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-300">
{`Execute esta instrucao no projeto: CORREÇÃO PONTUAL — NÃO PERGUNTAR SE "MÃO" SIGNIFICA MANICURE.

O teste real mostrou que a Julia está respondendo algo como:

"Quando você fala mão, está se referindo a manicure?"

Esse comportamento está INCORRETO.

REGRA DE NEGÓCIO:

No contexto de serviços do salão:

"mão"
"fazer a mão"
"fazer mão"
"unha da mão"
"fazer as mãos"

devem ser normalizados DIRETAMENTE para:

serviceIntent = MANICURE

NÃO pedir confirmação semântica ao cliente.

==================================================
EXEMPLO
==================================================

Cliente:
"Quero fazer a mão hoje"

CORRETO:

serviceIntent = manicure
date = hoje

Depois consultar list_services da unidade correta.

INCORRETO:

"Você quer dizer manicure?"
"Quando fala mão, é manicure?"
"Qual serviço você deseja?"

==================================================
IMPORTANTE — NÃO CONFUNDIR COM AMBIGUIDADE DE CATÁLOGO
==================================================

A normalização:

"mão" -> intenção MANICURE

é determinística.

But o serviceId continua vindo do catálogo REAL do BEMP.

Fluxo:

"mão"
→ serviceIntent = manicure
→ list_services da unidade correta
→ analisar candidatos reais

Se houver UM serviço de manicure compatível:
→ resolver diretamente.

Se houver MAIS DE UM serviço realmente compatível:
→ SERVICE_CLARIFICATION_REQUIRED

Mas nesse caso a pergunta deve ser sobre QUAL OPÇÃO DE MANICURE,
e NÃO sobre se "mão" significa manicure.

Exemplo:

Cliente:
"Quero fazer a mão hoje"

BEMP retorna:
- Manicure
- Manicure + Pedicure

Julia pode perguntar:

"Para hoje, você gostaria de Manicure ou Manicure + Pedicure?"

A data HOJE deve permanecer salva.

==================================================
DATA
==================================================

Se a mesma mensagem contém:

"hoje"

dateResolved deve ser preenchida imediatamente.

A Julia NÃO pode perguntar novamente:
"qual dia?"
"para quando?"

Depois que o serviço for definido:

unitId
+
serviceId
+
dateResolved

→ chamar list_slots.

==================================================
TESTE REAL QUE DEVE PASSAR
==================================================

Mensagem:
"Oi, quero fazer a mão hoje"

Resultado esperado:

"MÃO" NORMALIZADA PARA MANICURE = SIM
PERGUNTOU SE MÃO SIGNIFICA MANICURE = NÃO
"HOJE" RESOLVIDO = SIM
PERGUNTOU A DATA NOVAMENTE = NÃO
LIST_SERVICES CHAMADA = SIM
UNITID CORRETO = SIM

Se houver serviço único:
SERVICEID RESOLVIDO = SIM
LIST_SLOTS CHAMADA = SIM

Se houver múltiplos serviços:
SERVICE_CLARIFICATION_REQUIRED = SIM
DATA "HOJE" PRESERVADA = SIM

==================================================
ESCOPO
==================================================

Não altere:
- preços
- price auditor
- mapeamento das unidades
- Evolution
- webhook
- Gemini/modelo
- list_slots
- regras de disponibilidade

Corrija SOMENTE a normalização semântica para que
"MÃO" seja intenção direta de MANICURE.

Depois execute o teste acima e mostre:

texto recebido =
serviceIntent =
dateResolved =
candidatos BEMP =
resposta Julia =
perguntou significado de "mão" = SIM/NÃO
perguntou data novamente = SIM/NÃO
resultado = APROVADO/FALHOU

PARE depois do teste.`}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2 text-sm uppercase">
              <Search className="w-4 h-4" />
              STATUS DO TESTE REAL
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <Activity className="w-4 h-4 animate-pulse" />
              AGUARDANDO: "Oi, quero fazer a mão hoje"
            </div>
            <div className="space-y-1">
              <p className="text-slate-600">Alvo: BOULEVARD (+55 41 3073-1358)</p>
              <p className="text-slate-600">Normalização: ATIVA (mão → manicure)</p>
              <p className="text-slate-600">Bloqueio Confirmação Semântica: ATIVO</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-sm uppercase">
              <FileText className="w-4 h-4" />
              MUDANÇAS APLICADAS
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2">
            <p className="text-slate-900 font-bold">src/lib/booking/context.ts</p>
            <p className="text-slate-600">- Expandido patterns de "mão" (plural e variações)</p>
            <p className="text-slate-900 font-bold mt-2">src/lib/chat.server.ts</p>
            <p className="text-slate-600">- Injetada REGRA ABSOLUTA no System Prompt contra perguntas de confirmação semântica para "mão".</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4 text-blue-600 text-sm font-bold bg-blue-50 rounded-lg animate-pulse">
        CORREÇÃO APLICADA. ENVIE A MENSAGEM NO WHATSAPP PARA VALIDAR.
      </div>
    </div>
  );
}
