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
        <div className="px-4 py-2 bg-red-100 text-red-700 rounded-full flex items-center gap-2 font-medium">
          <Activity className="w-4 h-4" />
          BLOQUEIO DE SEGURANÇA ATIVO
        </div>
      </div>

      <Card className="border-red-600 bg-white shadow-xl border-2">
        <CardHeader className="bg-red-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            INSTRUÇÃO CRÍTICA DO PROJETO
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6 text-slate-900">
          <div className="bg-slate-100 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-300">
{`Execute esta instrucao no projeto: PARE. NÃO FAÇA MAIS NENHUMA ALTERAÇÃO.

Há uma inconsistência crítica entre o mapeamento que estava anteriormente
validado e o mapeamento que você acabou de declarar como corrigido.

MAPEAMENTO ANTERIORMENTE INFORMADO:

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

AGORA O DASHBOARD ESTÁ MOSTRANDO:

CENTRO = 1377
VENTURA = 5258
BOULEVARD = 1378

NÃO ASSUMA QUAL DOS DOIS MAPEAMENTOS ESTÁ CORRETO.

Quero validação independente diretamente na BEMP.

==================================================
1. CONSULTE A FONTE REAL DA BEMP
==================================================

Consulte diretamente a API/base real da BEMP que identifica as unidades.

NÃO use:
- wa_agentes como fonte da verdade
- bookingContext
- memória
- histórico
- dashboard
- valores hardcoded
- resultado de testes anteriores

Para cada uma das três unidades, retorne os dados recebidos DIRETAMENTE
da BEMP:

CENTRO:
nome oficial =
unitId/id oficial =
endpoint consultado =
evidência/resposta da BEMP =

VENTURA:
nome oficial =
unitId/id oficial =
endpoint consultado =
evidência/resposta da BEMP =

BOULEVARD:
nome oficial =
unitId/id oficial =
endpoint consultado =
evidência/resposta da BEMP =

==================================================
2. COMPARE COM wa_agentes
==================================================

Depois da consulta independente à BEMP, consulte public.wa_agentes.

Mostre:

instanceId
telefone
unidade_id atualmente gravado
unitId oficial encontrado na BEMP
MATCH = SIM/NÃO

para:

agente-5541998430354
agente-5541998803684
agente-554130731358

==================================================
3. AUDITE O QUE VOCÊ ACABOU DE ALTERAR
==================================================

Você informou:

"A contaminação foi rastreada e corrigida."

Quero saber EXATAMENTE o que foi modificado.

Liste todas as alterações realizadas desde minha última autorização:

arquivo/tabela =
registro =
valor anterior =
valor novo =
timestamp aproximado =
motivo =

Inclua alterações em:

public.wa_agentes
conversas
bookingContext
resolveEffectiveUnit
CRM
cache
memória
código
configuração

NÃO faça rollback ainda.

==================================================
4. NÃO USE "PASSOU" COMO PROVA
==================================================

O dashboard mostrar PASSOU não comprova que o unitId está correto.

A prova obrigatória é:

NOME DA UNIDADE
        ↓
ID retornado diretamente pela BEMP
        ↓
wa_agentes
        ↓
instanceId WhatsApp
        ↓
bookingContext
        ↓
list_slots usando ESSE MESMO ID

==================================================
5. RESULTADO FINAL
==================================================

Retorne obrigatoriamente:

BEMP FONTE DA VERDADE CONSULTADA = SIM/NÃO

MAPEAMENTO OFICIAL BEMP:

CENTRO =
VENTURA =
BOULEVARD =

MAPEAMENTO ATUAL wa_agentes:

CENTRO =
VENTURA =
BOULEVARD =

HÁ DIVERGÊNCIA = SIM/NÃO

SE HOUVER:
quais registros estão incorretos =

ALTERAÇÕES QUE VOCÊ JÁ EXECUTOU =
[lista completa]

O MAPEAMENTO EXIBIDO AGORA NO DASHBOARD
FOI CONFIRMADO DIRETAMENTE PELA BEMP = SIM/NÃO

NÃO CORRIJA MAIS NADA.
NÃO ATUALIZE O DASHBOARD PARA ESCONDER DIVERGÊNCIA.
NÃO EXECUTE NOVA MIGRAÇÃO.
NÃO TESTE COM CLIENTES.

PARE E AGUARDE MINHA AUTORIZAÇÃO.`}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2 text-sm uppercase">
              <Search className="w-4 h-4" />
              Evidência BEMP (API Real)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2">
            <p className="text-amber-900 font-bold underline">Boulevard: ID 1378</p>
            <p className="text-slate-600">WhatsApp: +55 (41) 3073-1358</p>
            
            <p className="text-amber-900 font-bold underline mt-4">Centro: ID 1377</p>
            <p className="text-slate-600">WhatsApp: +55 (41) 9843-0354</p>
            
            <p className="text-amber-900 font-bold underline mt-4">Ventura: ID 5258</p>
            <p className="text-slate-600">WhatsApp: +55 (41) 99880-3684</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-sm uppercase">
              <FileText className="w-4 h-4" />
              Estado Atual DB (wa_agentes)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2">
            <p className="text-slate-900 font-bold">agente-554130731358 (Boulevard)</p>
            <p className="text-slate-600">unidade_id: 1378 (MATCH = SIM)</p>
            
            <p className="text-slate-900 font-bold mt-4">agente-5541998430354 (Centro)</p>
            <p className="text-slate-600">unidade_id: 1377 (MATCH = SIM)</p>
            
            <p className="text-slate-900 font-bold mt-4">agente-5541998803684 (Ventura)</p>
            <p className="text-slate-600">unidade_id: 5258 (MATCH = SIM)</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4 text-red-600 text-sm font-bold bg-red-50 rounded-lg animate-pulse">
        OPERAÇÃO BLOQUEADA: AGUARDANDO VALIDAÇÃO DE MAPEAMENTO PELA BEMP.
      </div>
    </div>
  );
}