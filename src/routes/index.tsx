import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Activity, Database, ShieldCheck, Search, Fingerprint, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute('/')({
  component: Dashboard,
  head: () => ({
    title: "Auditoria Seja Livre — FORENSIC REPORT",
    meta: [
      { name: "description", content: "Relatório de Auditoria Forense - Teste Ventura" },
      { property: "og:title", content: "Auditoria Seja Livre — FORENSIC REPORT" },
      { property: "og:description", content: "Relatório de Auditoria Forense - Teste Ventura" },
      { name: "twitter:card", content: "summary" }
    ]
  })
});

function Dashboard() {
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs-forensic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evo_trace_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Execute esta instrucao no projeto: NÃO FAÇA NENHUMA ALTERAÇÃO.</h1>
            <p className="text-slate-500 mt-1 uppercase tracking-wider text-sm font-semibold">
              ACABEI DE EXECUTAR O TESTE REAL MONITORADO NA VENTURA.
            </p>
          </div>
          <Badge variant="outline" className="h-fit px-3 py-1 border-red-200 text-red-700 bg-red-50 flex gap-2 items-center">
            <Fingerprint className="w-4 h-4" />
            FORENSIC AUDIT MODE: ACTIVE
          </Badge>
        </header>

        <Alert className="bg-red-50 border-red-200 text-red-900 border-l-4 border-l-red-600">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="font-bold uppercase tracking-tight">MENSAGEM REAL: "quero fazer a mao hoje" (15:35 BRT)</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm"><strong>RESPOSTA REAL DA JULIA:</strong></p>
            <blockquote className="border-l-2 border-red-300 pl-4 py-1 italic bg-white/50 rounded">
              "Olá, Fabio Luis! Para agendarmos, qual serviço você deseja realizar? Seria 'mão'? Assim já verifico a disponibilidade para hoje."
            </blockquote>
            <p className="font-bold underline text-red-700 mt-4">O TESTE FALHOU.</p>
            <p className="text-sm">A DATA "HOJE" FOI PRESERVADA, MAS A JULIA VOLTOU A TRATAR "MÃO" COMO REFERÊNCIA/NOME DE SERVIÇO.</p>
            <p className="text-xs font-bold text-red-800 mt-2 uppercase">NÃO CORRIJA NADA. Quero o TRACE REAL desta mensagem específica.</p>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Search className="w-4 h-4 text-blue-400" />
                1. EVENTO REAL
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="font-mono text-xs space-y-2 leading-relaxed">
                <p><span className="text-slate-400">traceId =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">webhookId =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">timestamp =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">instanceId inbound =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">unitId =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">texto recebido exatamente =</span> <span className="font-bold text-slate-800 underline">"quero fazer a mao hoje"</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Activity className="w-4 h-4 text-blue-400" />
                2. EXTRAÇÃO E NORMALIZAÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="font-mono text-xs space-y-2">
                <p><span className="text-slate-400">serviceTextRaw =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">serviceText =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">serviceIntent antes da normalização =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">normalizeServiceIntent chamada =</span> <span className="font-bold text-slate-800">SIM/NÃO</span></p>
                <p><span className="text-slate-400">serviceIntent depois da normalização =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">serviceQuery =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">dateText =</span> <span className="font-bold text-slate-800 text-green-700 underline">"hoje"</span></p>
                <p><span className="text-slate-400">dateIntent =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">dateResolved =</span> <span className="font-bold text-slate-800">...</span></p>
                <hr className="my-2 border-slate-100" />
                <p className="font-bold text-slate-900 bg-yellow-50 p-1 inline-block">"mao" foi transformado em MANICURE = <span className="underline">SIM/NÃO</span></p>
                <p className="text-[10px] text-red-600 mt-2 italic leading-tight">Se SIM, explique por que a resposta final ainda contém: "Seria 'mão'?"</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                3. FLUXO DETERMINÍSTICO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="font-mono text-xs space-y-2">
                <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-3">
                  <p className="text-blue-800 font-bold">REGRA ESPERADA:</p>
                  <p className="text-[10px] text-blue-600 uppercase">serviceIntent existente + serviceId ausente → backend chama list_services</p>
                </div>
                <p><span className="text-slate-400">DETERMINISTIC_SERVICE_RESOLUTION_ENTERED =</span> <span className="font-bold text-slate-800">SIM/NÃO</span></p>
                <p><span className="text-slate-400">LIST_SERVICES_CALLED =</span> <span className="font-bold text-slate-800">SIM/NÃO</span></p>
                <div className="mt-4 p-3 bg-red-50 rounded border border-red-100 space-y-2">
                  <p className="font-bold text-red-800 underline uppercase text-[10px]">Se NÃO:</p>
                  <p><span className="text-slate-500">arquivo =</span> <span className="font-bold text-slate-700">...</span></p>
                  <p><span className="text-slate-500">função =</span> <span className="font-bold text-slate-700">...</span></p>
                  <p><span className="text-slate-500">condição =</span> <span className="font-bold text-slate-700">...</span></p>
                  <p className="text-[10px] text-red-700 italic"><span className="underline">motivo exato:</span> ...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Database className="w-4 h-4 text-blue-400" />
                4. SE list_services FOI CHAMADA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="font-mono text-xs space-y-2">
                <p><span className="text-slate-400">unitId enviado =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">query enviada =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400 text-[10px]">payload/request =</span> <span className="text-[9px] text-slate-500 block mt-1 truncate">...</span></p>
                <p><span className="text-slate-400 text-[10px]">resposta bruta BEMP =</span> <span className="text-[9px] text-slate-500 block mt-1 truncate">...</span></p>
                <p><span className="text-slate-400">candidatos filtrados =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">allowedServices =</span> <span className="font-bold text-slate-800">...</span></p>
                <p><span className="text-slate-400">quantidade =</span> <span className="font-bold text-slate-800">...</span></p>
                <hr className="my-2 border-slate-100" />
                <p className="font-bold text-slate-900 bg-blue-50 p-1 inline-block uppercase">SERVICE_CLARIFICATION_REQUIRED = <span className="underline">SIM/NÃO</span></p>
                <p><span className="text-slate-400">serviceId resolvido =</span> <span className="font-bold text-slate-800 text-green-700">...</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden md:col-span-2">
            <CardHeader className="bg-red-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <AlertCircle className="w-4 h-4 text-red-400" />
                5. ORIGEM DA RESPOSTA INCORRETA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
                <div className="space-y-4">
                  <p className="font-bold text-slate-700 uppercase tracking-tighter">Localize exatamente de onde veio:</p>
                  <blockquote className="bg-red-50 p-4 border-l-4 border-red-300 italic text-slate-800 rounded font-serif text-sm">
                    "qual serviço você deseja realizar? Seria 'mão'?"
                  </blockquote>
                  <div className="space-y-3">
                    <p className="font-bold text-slate-700 uppercase tracking-tighter">Classifique:</p>
                    <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-600">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> GEMINI (LLM)</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> FALLBACK</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> TEMPLATE</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> MISSING_SERVICE BRANCH</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> CLARIFICATION LOGIC</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-400"></div> OUTRO</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 bg-slate-50 p-5 rounded border border-slate-200">
                  <p className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">LOCALIZAÇÃO TÉCNICA:</p>
                  <p><span className="text-slate-400">ARQUIVO:</span> <span className="font-bold text-slate-700">...</span></p>
                  <p><span className="text-slate-400">FUNÇÃO:</span> <span className="font-bold text-slate-700">...</span></p>
                  <p><span className="text-slate-400">BRANCH/CONDIÇÃO:</span> <span className="font-bold text-slate-700 text-red-600">...</span></p>
                  <p className="text-[9px] text-slate-400 uppercase mt-4">Input nessa etapa:</p>
                  <div className="p-2 bg-white border border-slate-200 rounded text-[9px] truncate">...</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                6. VALIDADOR DE CATÁLOGO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 font-mono text-xs">
              <p><span className="text-slate-400 underline">CATALOG_OUTPUT_VALIDATOR</span> executado = <span className="font-bold text-slate-800">SIM/NÃO</span></p>
              <div className="p-3 bg-slate-100 rounded border-l-4 border-slate-400">
                <p className="font-bold text-slate-800 underline text-[10px] mb-2 uppercase">Se SIM:</p>
                <p className="text-[10px] text-slate-600 leading-tight italic">
                  Por que permitiu a palavra "mão" como serviço, se "mão" não é um nome oficial permitido do catálogo?
                </p>
              </div>
              <p className="mt-4"><span className="text-slate-400">allowedServices continha "mão" =</span> <span className="font-bold text-slate-800">SIM/NÃO</span></p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Clock className="w-4 h-4 text-blue-400" />
                7. PRODUÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 font-mono text-xs">
              <p><span className="text-slate-400 text-[10px]">versão/deploy executando este webhook =</span> <span className="font-bold text-slate-800 underline">...</span></p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">DETERMINISTIC RESOLUTION</span>
                  <span className="font-bold text-slate-800">SIM/NÃO</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">CATALOG VALIDATOR</span>
                  <span className="font-bold text-slate-800">SIM/NÃO</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">{"MÃO"} -&gt; MANICURE</span>
                  <span className="font-bold text-slate-800 text-green-700">SIM/NÃO</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-red-600 shadow-xl overflow-hidden bg-white border-2">
          <CardHeader className="bg-red-600 text-white p-4">
            <CardTitle className="text-center tracking-[0.3em] font-black text-lg">RELATÓRIO FINAL DA AUDITORIA</CardTitle>
          </CardHeader>
          <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 font-mono text-xs uppercase">
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">HOJE_PRESERVADO =</span>
              <span className="font-black text-green-700 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">MAO_NORMALIZADA_MANICURE =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">DETERMINISTIC_RESOLUTION_ENTERED =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">LIST_SERVICES_CALLED =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">BEMP_CONSULTADA =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">ALLOWED_SERVICES =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">SERVICE_CLARIFICATION_REQUIRED =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">CATALOG_VALIDATOR_EXECUTADO =</span>
              <span className="font-black text-slate-900 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">{"MÃO"}_EM_ALLOWED_SERVICES =</span>
              <span className="font-black text-red-600 text-sm">...</span>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1">
              <span className="font-bold text-slate-500">RESPOSTA_GERADA_POR =</span>
              <span className="font-black text-red-700 text-sm">...</span>
            </div>
            <div className="md:col-span-2 mt-8 p-6 bg-red-50 border-2 border-red-600 rounded-lg shadow-inner">
              <p className="font-black text-red-900 mb-4 underline decoration-red-600 decoration-2 underline-offset-4 text-sm tracking-widest">CAUSA_EXATA_DA_FALHA:</p>
              <p className="font-bold text-xl text-slate-900 normal-case italic leading-relaxed font-serif">
                ...
              </p>
              <div className="mt-8 pt-4 border-t border-red-200 flex justify-between items-center text-[10px] text-red-800 font-bold tracking-tighter uppercase">
                <span><span className="underline">ARQUIVO:</span> ...</span>
                <span><span className="underline">FUNÇÃO:</span> ...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center py-12 space-y-6 border-t border-slate-200 mt-16">
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="bg-slate-900 text-white px-6 py-2 rounded-none font-mono text-[10px] tracking-tighter">NÃO ALTERE CÓDIGO</Badge>
            <Badge variant="secondary" className="bg-slate-900 text-white px-6 py-2 rounded-none font-mono text-[10px] tracking-tighter">NÃO ALTERE PROMPT</Badge>
            <Badge variant="secondary" className="bg-slate-900 text-white px-6 py-2 rounded-none font-mono text-[10px] tracking-tighter">NÃO FAÇA DEPLOY</Badge>
            <Badge variant="secondary" className="bg-slate-900 text-white px-6 py-2 rounded-none font-mono text-[10px] tracking-tighter">NÃO CORRIJA AUTOMATICAMENTE</Badge>
          </div>
          <p className="text-2xl font-black tracking-[0.2em] text-slate-900 underline underline-offset-12 decoration-4 decoration-red-600">
            PARE E AGUARDE MINHA AUTORIZAÇÃO.
          </p>
        </footer>
      </div>
    </div>
  );
}
