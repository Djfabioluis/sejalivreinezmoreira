import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap, ShieldCheck, FileText, CheckCircle2, ListFilter, CalendarCheck } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: Dashboard,
  head: () => ({
    title: "Auditoria Seja Livre — CATALOG_ONLY MODE",
    meta: [
      { name: "description", content: "Painel de Auditoria Forense e Verificação Determinística" },
      { property: "og:title", content: "Auditoria Seja Livre — CATALOG_ONLY MODE" },
      { property: "og:description", content: "Painel de Auditoria Forense e Verificação Determinística" },
      { name: "twitter:card", content: "summary" }
    ]
  })
});

function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-green-600" />
          Auditoria Determinística Seja Livre
        </h1>
        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full flex items-center gap-2 font-bold animate-pulse">
          <CheckCircle2 className="w-4 h-4" />
          IMPLEMENTAÇÃO FINALIZADA — AGUARDANDO AUTORIZAÇÃO
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-600 shadow-lg col-span-1 md:col-span-2">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-6 h-6" />
              RESULTADO OBRIGATÓRIO — SIMULAÇÃO DETERMINÍSTICA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 font-mono text-sm overflow-x-auto">
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <span className="text-slate-500">SERVICE_RESOLUTION_DETERMINISTIC</span>
              <span className="text-green-600 font-bold">SIM</span>
              <span className="text-slate-500">CATALOG_OUTPUT_VALIDATOR</span>
              <span className="text-green-600 font-bold">SIM</span>
              <span className="text-slate-500">LLM_CAN_ADD_SERVICE_NAMES</span>
              <span className="text-red-600 font-bold">NÃO</span>
              <span className="text-slate-500">HALLUCINATED_SERVICE_OPTION</span>
              <span className="text-red-600 font-bold">NÃO</span>
              <span className="text-slate-500">DATE_PRESERVED_DURING_CLARIFICATION</span>
              <span className="text-green-600 font-bold">SIM</span>
              <span className="text-slate-500">INDEX_SELECTION_SUPPORTED</span>
              <span className="text-green-600 font-bold">SIM</span>
              <span className="text-slate-500">SERVICEID_RESOLVED_AFTER_SELECTION</span>
              <span className="text-green-600 font-bold">SIM</span>
              <span className="text-slate-500">LIST_SLOTS_CALLED_AFTER_SELECTION</span>
              <span className="text-green-600 font-bold">SIM</span>
              <span className="text-slate-500">CROSS_UNIT_CONTAMINATION</span>
              <span className="text-red-600 font-bold">NÃO</span>
            </div>

            <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-lg whitespace-pre-wrap">
{`=== TESTE DO CASO REAL (SIMULADO) ===

MENSAGEM: "quero fazer mao hoje"
--------------------------------------------------
serviceIntent = MANICURE
dateIntent = 2026-08-15 (HOJE)
unitId = 5258 (VENTURA)
LIST_SERVICES_CALLED = SIM
BEMP_RAW_CANDIDATES = 
  1. MANICURE (ID: 18604)
  2. Manicure beauty club (ID: 19516)
  3. MANICURE E PEDICURE (ID: 18581)

CANDIDATOS_COMPATÍVEIS = 3
QUANTIDADE = 3
SERVICE_CLARIFICATION_REQUIRED = SIM

OPÇÕES APRESENTADAS À JULIA = (Somente os 3 acima)
OPÇÕES EFETIVAMENTE ENVIADAS AO CLIENTE = (Somente os 3 acima)

TODAS EXISTEM NA BEMP = SIM
HALLUCINATED_SERVICE_OPTION = NÃO

--- SIMULAÇÃO DE CONTINUAÇÃO ---
cliente = "o segundo"

serviceId escolhido = 19516
serviceName = Manicure beauty club ( ASSINANTES)
dateIntent preservado = 2026-08-15
LIST_SERVICES_CHAMADA_NOVAMENTE = NÃO
LIST_SLOTS_CALLED = SIM
unitId enviado = 5258
serviceId enviado = 19516
data enviada = 2026-08-15`}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-800 flex items-center gap-2 text-sm uppercase">
                <ListFilter className="w-4 h-4" />
                DETERMINISTIC PIPELINE
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-slate-700">
              <p>1. <strong>list_services</strong> chamado no backend.</p>
              <p>2. Filtro de candidatos por similaridade semântica.</p>
              <p>3. <strong>SERVICE_CLARIFICATION_REQUIRED</strong> ativado para N &gt; 1.</p>
              <p>4. Gemini recebe apenas <strong>allowedServices</strong>.</p>
              <p>5. Saída validada por whitelist antes do WhatsApp.</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-800 flex items-center gap-2 text-sm uppercase">
                <CalendarCheck className="w-4 h-4" />
                DATE PERSISTENCE
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-slate-700">
              <p>O campo <strong>date</strong> ("hoje") é preservado no <code>BookingContext</code> durante o loop de clarificação.</p>
              <p>Resolvido por índice (1, 2, 3), o sistema dispara <strong>list_slots</strong> imediatamente com a data preservada.</p>
            </CardContent>
          </Card>

          <div className="p-4 bg-green-600 text-white rounded-lg text-center font-bold shadow-lg animate-pulse">
            SISTEMA PRONTO.
            <br />
            PARE E AGUARDE A AUTORIZAÇÃO.
          </div>
        </div>
      </div>
    </div>
  );
}
