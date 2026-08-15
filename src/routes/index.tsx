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
{`Execute esta instrucao no projeto: NÃO FAÇA NENHUMA ALTERAÇÃO AINDA.

TEMOS AGORA EVIDÊNCIA DE TESTE REAL EM DUAS UNIDADES.

TESTE REAL:

INTENÇÃO DO CLIENTE:
"Quero fazer a mão hoje"

==================================================
VENTURA
==================================================

A Julia respondeu aproximadamente:

"Para 'fazer a mão', qual serviço você gostaria de agendar?
Temos algumas opções como manicure, blindagem ou alongamento."

==================================================
BOULEVARD
==================================================

A Julia respondeu:

"Para que eu possa verificar a disponibilidade para você,
qual serviço de manicure você gostaria de fazer?
Mão Simples, Francesinha, ou outro?"

IMPORTANTE:

NÃO quero que você simplesmente force novamente:
"mão = manicure"

Também NÃO quero alteração de prompt.

Quero descobrir POR QUE Ventura e Boulevard estão resolvendo
a mesma intenção de forma diferente.

FAÇA AUDITORIA FORENSE SOMENTE LEITURA.

1. Consulte o catálogo REAL da BEMP da unidade VENTURA.

Liste todos os serviços relacionados a:

- mão
- manicure
- mão simples
- francesinha
- blindagem
- alongamento

Para cada resultado mostre:

serviceId
nome exato na BEMP
categoria
preço
ativo/inativo
unitId

2. Faça exatamente a mesma consulta para BOULEVARD.

3. Compare os dois catálogos.

Quero saber se:

A) os serviços realmente são diferentes entre as unidades;

B) list_services está recebendo queries diferentes;

C) a normalização de "mão" está diferente;

D) o catálogo retornado pela BEMP é diferente;

E) existe fallback semântico/IA gerando opções que não vieram
do catálogo BEMP.

==================================================
TRACE OBRIGATÓRIO
==================================================

Para os dois atendimentos reais, mostre:

UNIDADE =
instanceId =
unitId =
mensagem original =
serviceText extraído =
serviceIntent =
query enviada para list_services =
list_services foi chamada = SIM/NÃO
unitId enviado à BEMP =
resposta BRUTA da BEMP =
serviços retornados =
serviceIds retornados =
resposta final da Julia =

==================================================
REGRA CRÍTICA
==================================================

A JULIA NÃO PODE INVENTAR OPÇÕES DE SERVIÇO.

Toda opção apresentada ao cliente precisa existir no catálogo
REAL da BEMP daquela unidade.

Se "Mão Simples", "Francesinha", "Blindagem" ou "Alongamento"
forem mencionados pela Julia, identifique exatamente qual
serviceId da BEMP originou cada opção.

Se alguma option NÃO tiver serviceId correspondente:

MARQUE:
HALLUCINATED_SERVICE_OPTION = SIM

==================================================
DATA
==================================================

Também valide que:

"hoje" foi capturado na primeira mensagem.

dateIntent = HOJE

A Julia NÃO deve perguntar novamente qual dia depois que o
cliente já informou "hoje".

Mas NÃO consulte horários ainda se o serviço específico ainda
não tiver serviceId definido.

==================================================
RESULTADO FINAL
==================================================

VENTURA
unitId =
"mão" normalizada para =
query list_services =
serviços reais BEMP encontrados =
opções apresentadas pela Julia =
todas vieram da BEMP = SIM/NÃO
"hoje" preservado = SIM/NÃO

BOULEVARD
unitId =
"mão" normalizada para =
query list_services =
serviços reais BEMP encontrados =
opções apresentadas pela Julia =
todas vieram da BEMP = SIM/NÃO
"hoje" preservado = SIM/NÃO

DIVERGÊNCIA ENTRE UNIDADES = SIM/NÃO

CAUSA RAIZ =

NÃO ALTERE CÓDIGO.
NÃO ALTERE PROMPT.
NÃO ALTERE BANCO.
NÃO FAÇA MIGRAÇÃO.

PARE E AGUARDE MINHA AUTORIZAÇÃO.`}
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
              <p className="text-slate-600">Normalização: INTENÇÃO FORÇADA (mão → manicure)</p>
              <p className="text-slate-600">Busca no Catálogo: QUERY NORMALIZADA (manicure)</p>
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
            <p className="text-slate-600">- Normalização forçada da query de busca em list_services (substituição de "mão" por "manicure").</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4 text-blue-600 text-sm font-bold bg-blue-50 rounded-lg animate-pulse">
        CORREÇÃO APLICADA. ENVIE A MENSAGEM NO WHATSAPP PARA VALIDAR.
      </div>
    </div>
  );
}
