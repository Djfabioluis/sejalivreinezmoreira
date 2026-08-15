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
{`Execute esta instrucao no projeto: AUTORIZO A CORREÇÃO, MAS SOMENTE DA CAUSA RAIZ IDENTIFICADA
NA AUDITORIA.

NÃO ALTERE O MAPEAMENTO DAS UNIDADES.
NÃO ALTERE instanceId.
NÃO ALTERE unitId.
NÃO ALTERE PREÇOS.
NÃO ALTERE WEBHOOK.
NÃO ALTERE EVOLUTION.
NÃO ALTERE MEMÓRIA/HISTÓRICO.
NÃO CRIE SERVIÇOS NO BANCO.

A auditoria confirmou:

HALLUCINATED_SERVICE_OPTION = SIM

e confirmou também que:

"mão" -> MANICURE

já está sendo normalizado corretamente.

PORTANTO:

NÃO faça nova correção da normalização de "mão".

O problema agora é impedir que o LLM/Gemini invente,
complete, renomeie ou sugira serviços que não vieram
do catálogo REAL da BEMP.

==================================================
REGRA ABSOLUTA — CATÁLOGO BEMP É A FONTE DA VERDADE
==================================================

Quando houver intenção de serviço:

1. Identifique a unidade pela instância inbound.

2. Preserve o unitId dessa unidade durante TODO o atendimento.

3. Normalize apenas a intenção de busca.

Exemplo:

"quero fazer a mão hoje"

serviceIntent = MANICURE
dateIntent = HOJE

4. Consulte list_services usando:

unitId da instância inbound
+
serviceIntent normalizado

5. A partir desse momento, SOMENTE os serviços realmente
retornados pela BEMP podem ser apresentados ao cliente.

O Gemini NÃO pode:

- inventar nomes;
- criar nomes amigáveis;
- completar nomes;
- criar modalidades;
- sugerir serviços por conhecimento próprio;
- misturar serviços de outra unidade;
- transformar categoria em serviço inexistente;
- apresentar exemplo que não esteja no retorno da BEMP.

==================================================
CATALOG_ONLY MODE
==================================================

Implemente uma proteção determinística:

CATALOG_ONLY = TRUE

Toda opção de serviço mencionada na resposta ao cliente
deve possuir obrigatoriamente:

serviceId
serviceName
unitId

originados da resposta REAL de list_services/BEMP.

Antes de enviar a resposta:

para cada serviço citado:

assert serviceId existe
assert serviceName existe no retorno BEMP
assert unitId == inboundUnitId

Se qualquer condição falhar:

NÃO ENVIE A OPÇÃO.

HALLUCINATED_SERVICE_OPTION deve ser impossível de chegar
ao WhatsApp.

==================================================
CASO "MÃO"
==================================================

Entrada:

"Quero fazer a mão hoje"

NÃO responder:

"Você se refere a manicure?"

NÃO inventar:

"Mão Simples"
"Francesinha"
"Blindagem"
"Alongamento"

a menos que esses nomes EXATOS tenham sido retornados
pela BEMP para aquela unidade.

Fluxo correto:

"mão"
→ serviceIntent MANICURE
→ preservar HOJE
→ list_services(unitId correto, MANICURE)
→ receber catálogo BEMP.

SE retornar exatamente 1 serviço compatível:

selecionar o serviceId real
e prosseguir para disponibilidade de HOJE.

SE retornar mais de 1 serviço compatível:

perguntar qual deles a cliente deseja,
mostrando SOMENTE nomes retornados pela BEMP.

SE retornar 0 serviços:

NÃO inventar alternativas.

Responder de forma segura informando que não encontrou
esse serviço naquela unidade e, se apropriado, oferecer
SOMENTE opções reais retornadas pelo catálogo da própria unidade.

==================================================
DATA NÃO PODE SER PERDIDA
==================================================

Se a mensagem original contém:

"hoje"

bookingContext.dateIntent = HOJE

Essa informação deve sobreviver à etapa de escolha do serviço.

Exemplo:

CLIENTE:
"Quero fazer a mão hoje"

JULIA:
[apresenta somente serviços reais BEMP, caso haja mais de um]

CLIENTE:
[seleciona serviço]

A Julia NÃO deve perguntar:

"Para qual dia?"

Ela já sabe:

dateIntent = HOJE.

Depois de obter serviceId:

→ list_slots
→ inboundUnitId
→ serviceId real
→ data de HOJE

==================================================
ISOLAMENTO DE UNIDADE
==================================================

Adicione validação imediatamente antes de:

list_services
e
list_slots

assert bookingContext.unitId === inboundUnitId

Nenhum dado de:

CENTRO
VENTURA
BOULEVARD

pode atravessar entre instâncias.

==================================================
VALIDAÇÃO
==================================================

Após implementar, execute testes automatizados:

VENTURA:
"Quero fazer a mão hoje"

BOULEVARD:
"Quero fazer a mão hoje"

CENTRO:
"Quero fazer a mão hoje"

Para cada unidade mostre:

instanceId =
inboundUnitId =
serviceIntent =
dateIntent =
list_services chamada = SIM/NÃO
unitId enviado =
resposta bruta BEMP =
serviceIds =
serviceNames =
opções efetivamente apresentadas =
TODAS AS OPÇÕES EXISTEM NA BEMP = SIM/NÃO
HALLUCINATED_SERVICE_OPTION = SIM/NÃO

Depois valide continuação:

cliente escolhe um serviço real.

Mostre:

serviceId preservado =
dateIntent preservado =
list_slots chamada = SIM/NÃO
unitId enviado ao list_slots =
data enviada =
slots retornados =

RESULTADO OBRIGATÓRIO:

3 UNIDADES ISOLADAS = SIM
CATALOG_ONLY = SIM
HALLUCINATED_SERVICE_OPTION = NÃO
"MÃO" NORMALIZADA PARA MANICURE = SIM
"HOJE" PRESERVADO = SIM
SERVIÇO ESCOLHIDO POSSUI serviceId BEMP = SIM
LIST_SLOTS USA A MESMA UNIDADE INBOUND = SIM

NÃO considere teste automatizado como prova final de produção.

Depois da implementação:

PARE.

NÃO faça novas alterações.

Aguarde minha autorização para TESTE REAL PELO WHATSAPP.`}
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

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2 text-sm uppercase">
              <FileText className="w-4 h-4" />
              CATALOG_ONLY MODE — APLICADO
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2">
            <p className="text-slate-900 font-bold">src/lib/booking/catalog-auditor.server.ts</p>
            <p className="text-slate-600">- Criado Sanitizer determinístico contra alucinações de serviços.</p>
            <p className="text-slate-900 font-bold mt-2">src/lib/chat.server.ts</p>
            <p className="text-slate-600">- Injetado CATALOG_ONLY MODE no pipeline de resposta.</p>
            <p className="text-slate-600">- Implementado Assert de isolamento de unidade em list_services e list_slots.</p>
            <p className="text-slate-600">- Garantida a preservação de dateIntent durante a seleção de serviços.</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4 text-blue-600 text-sm font-bold bg-blue-50 rounded-lg animate-pulse">
        CORREÇÃO APLICADA. ENVIE A MENSAGEM NO WHATSAPP PARA VALIDAR.
      </div>
    </div>
  );
}
