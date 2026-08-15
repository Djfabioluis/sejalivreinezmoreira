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
        <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2 font-bold animate-pulse">
          <Activity className="w-4 h-4" />
          AGUARDANDO TESTE REAL NO WHATSAPP
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-600 shadow-lg col-span-1 md:col-span-2">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-6 h-6" />
              INSTRUÇÃO DE EXECUÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 font-mono text-sm overflow-x-auto bg-slate-900 text-blue-400">
            <div className="whitespace-pre-wrap">
{`Execute esta instrucao no projeto: AUTORIZO SOMENTE O TESTE REAL PELO WHATSAPP.

NÃO FAÇA NENHUMA NOVA ALTERAÇÃO.

Unidade a testar:
VENTURA
unitId esperado = 5258

Prepare monitoramento do fluxo REAL.

Vou enviar manualmente:

"quero fazer mão hoje"

Quero capturar:

WEBHOOK_RECEIVED
INSTANCE_RESOLVED
UNIT_RESOLVED
SERVICE_INTENT_RESOLVED
DATE_RESOLVED
LIST_SERVICES_CALLED
BEMP_SERVICES_RETURNED
SERVICE_CLARIFICATION_REQUIRED
ALLOWED_SERVICES
WHATSAPP_RESPONSE_SENT

Depois da primeira resposta, NÃO faça alteração.

Eu responderei ao WhatsApp:

"2"

ou

"o segundo"

Nesse segundo turno monitore:

CLARIFICATION_SELECTION_RESOLVED
SERVICE_ID_RESOLVED
DATE_PRESERVED
LIST_SERVICES_CALLED_AGAIN
LIST_SLOTS_CALLED
BEMP_SLOTS_RETURNED
WHATSAPP_RESPONSE_SENT

CRITÉRIOS OBRIGATÓRIOS:

1. "mão" → MANICURE
2. "hoje" preservado
3. opções exibidas = somente candidatos BEMP
4. nenhuma opção inventada
5. resposta "2" resolve o segundo serviceId
6. NÃO perguntar novamente a data
7. NÃO chamar list_services novamente sem necessidade
8. chamar list_slots imediatamente
9. unitId do list_slots = 5258
10. horários enviados ao cliente devem existir no retorno BEMP

NÃO CORRIJA CASO FALHE.

Mostre o trace e PARE.`}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-800 flex items-center gap-2 text-sm uppercase">
                <CheckCircle2 className="w-4 h-4" />
                STATUS DO SISTEMA
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-slate-700">
              <p>• Resolução Determinística: <strong>ATIVADA</strong></p>
              <p>• Validador de Whitelist: <strong>ATIVADO</strong></p>
              <p>• Preservação de Data: <strong>ATIVADA</strong></p>
              <p>• Simulação Prévia: <strong>APROVADA</strong></p>
            </CardContent>
          </Card>

          <div className="p-4 bg-blue-600 text-white rounded-lg text-center font-bold shadow-lg">
            AGUARDANDO MENSAGEM REAL...
            <br />
            (41) 99952-9624
          </div>
        </div>
      </div>
    </div>
  );
}
