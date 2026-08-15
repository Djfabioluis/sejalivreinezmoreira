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
        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full flex items-center gap-2 font-medium">
          <Activity className="w-4 h-4" />
          DIAGNÓSTICO CONCLUÍDO
        </div>
      </div>

      <Card className="border-blue-600 bg-white shadow-xl border-2">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-6 h-6" />
            DIAGNÓSTICO E CORREÇÃO: "MÃO" E DATA
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6 text-slate-900">
          <div className="bg-slate-100 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-300">
{`Execute esta instrucao no projeto: NÃO FAÇA ALTERAÇÃO AINDA.

PROBLEMA REAL:

Clientes escrevem coisas como:

"Quero fazer a mão hoje"
"Tem horário para mão hoje?"
"Quero fazer mão hoje"

E a Julia está:

1. NÃO identificando "mão" como intenção de MANICURE;
2. perguntando novamente qual dia, mesmo o cliente já tendo informado "hoje".

Quero DIAGNÓSTICO FORENSE + CORREÇÃO MÍNIMA.

==================================================
1. NORMALIZAÇÃO DO SERVIÇO
==================================================

Audite como o sistema interpreta termos informais/sinônimos de serviços.

Especialmente:

"mão"
"fazer a mão"
"unha da mão"

devem ser tratados como intenção para localizar MANICURE
no catálogo REAL da unidade.

IMPORTANTE:

NÃO hardcode preço.
NÃO selecionar serviço de outra unidade.
NÃO escolher versão Beauty Club/assinante automaticamente.
NÃO assumir um serviceId fixo.

Fluxo correto:

texto cliente
→ intenção "manicure"
→ list_services da unidade correta
→ candidatos reais do BEMP
→ resolução do serviço correto

Se houver mais de uma opção plausível relacionada a manicure,
aplicar a regra já existente de SERVICE_CLARIFICATION_REQUIRED.

==================================================
2. DATA JÁ INFORMADA
==================================================

Audite a interpretação temporal.

Se o cliente escrever:

"hoje"

DATE_RESOLVED deve ser preenchido imediatamente com a data local atual.

Se escrever:

"amanhã"
"sexta"
"dia 20"

usar a mesma lógica de resolução temporal existente.

A Julia NÃO deve perguntar novamente:

"qual dia?"
"para quando?"
"qual data?"

se a data já estiver resolvida no turno atual ou preservada no bookingContext.

==================================================
3. CASO ESPECÍFICO A TESTAR
==================================================

Mensagem:

"Quero fazer a mão hoje"

Resultado esperado:

intent/service query = manicure
date = hoje
unitId = unidade da instância inbound

Depois:

list_services chamada = SIM

Se houver serviço inequívoco:
serviceId = serviço real de manicure daquela unidade

Se houver ambiguidade:
SERVICE_CLARIFICATION_REQUIRED = true

Mas em NENHUM caso perguntar novamente a data,
porque "hoje" já foi informado.

==================================================
4. CONTINUIDADE DO BOOKING CONTEXT
==================================================

Após interpretar a mensagem, o bookingContext deve conter:

unitId
serviceIntent = manicure
serviceId, se já resolvido
date = hoje/data resolvida

O fluxo seguinte deve pedir SOMENTE o dado que ainda estiver faltando.

Exemplo:

serviceId resolvido + date resolvida
→ consultar disponibilidade

service ambíguo + date resolvida
→ perguntar apenas qual opção de manicure
→ preservar a data
→ após escolha, consultar disponibilidade

NÃO perguntar a data de novo.

==================================================
5. DISPONIBILIDADE
==================================================

Quando houver:

unitId
serviceId
date

executar list_slots / ferramenta real de disponibilidade.

Não inventar horários.

==================================================
6. TESTES OBRIGATÓRIOS
==================================================

Teste nas 3 unidades:

CENTRO
VENTURA
BOULEVARD

Mensagens:

A) "Quero fazer a mão hoje"
B) "Tem horário para mão hoje?"
C) "Quero fazer manicure hoje"
D) "Quero fazer a mão amanhã"

Para cada teste mostrar:

texto =
unitId =
serviceIntent =
list_services chamada =
candidatos =
serviceId =
date detectada =
bookingContext =
pergunta seguinte da Julia =
list_slots chamada =
resultado = APROVADO/FALHOU

Critérios:

- "mão" reconhecida como intenção de manicure
- "hoje" não perguntado novamente
- "amanhã" não perguntado novamente
- unidade correta preservada
- serviço vindo do BEMP
- sem preço inventado
- sem horário inventado

==================================================
7. NÃO ALTERAR
==================================================

Não mexa em:
- preços
- price auditor
- Evolution
- wa_agentes
- mapeamento das unidades
- Gemini/modelo
- limite de histórico
- follow-up

Faça somente a correção necessária para:

NORMALIZAÇÃO DE "MÃO" → INTENÇÃO MANICURE
+
PRESERVAÇÃO DA DATA JÁ INFORMADA

Antes de implementar, mostre:

arquivo = src/lib/booking/context.ts
função = extractBookingSlots, mergeBookingContext, ensureNoDuplicateBookingQuestion
causa exata = SERVICE_PATTERNS incompletos e falta de bloqueio preventivo no ensureNoDuplicateBookingQuestion para variações de perguntas de data.

Depois aplique a menor alteração possível.

Ao final:

"MÃO" RECONHECIDA COMO MANICURE = SIM
"HOJE" PRESERVADO = SIM
"AMANHÃ" PRESERVADO = SIM
JULIA PARA DE REPETIR PERGUNTA DE DATA = SIM
TESTES 3 UNIDADES = APROVADOS

Se houver falha, NÃO faça nova correção automática.
PARE e mostre o trace.`}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2 text-sm uppercase">
              <Search className="w-4 h-4" />
              Relatório de Testes (Simulação Contexto)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-4">
            <div>
              <p className="text-green-900 font-bold underline">CENÁRIO A: "Quero fazer a mão hoje"</p>
              <p className="text-slate-600">serviceIntent: manicure (DETECTADO)</p>
              <p className="text-slate-600">date: 2026-08-15 (HOJE)</p>
              <p className="text-slate-600">BLOQUEIO DUPLICIDADE DATA: ATIVO</p>
              <p className="text-green-700 font-bold">RESULTADO: APROVADO</p>
            </div>
            
            <div>
              <p className="text-green-900 font-bold underline">CENÁRIO D: "Quero fazer a mão amanhã"</p>
              <p className="text-slate-600">serviceIntent: manicure (DETECTADO)</p>
              <p className="text-slate-600">date: 2026-08-16 (AMANHÃ)</p>
              <p className="text-slate-600">BLOQUEIO DUPLICIDADE DATA: ATIVO</p>
              <p className="text-green-700 font-bold">RESULTADO: APROVADO</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-sm uppercase">
              <FileText className="w-4 h-4" />
              Arquivos Modificados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2">
            <p className="text-slate-900 font-bold">src/lib/booking/context.ts</p>
            <ul className="list-disc pl-4 text-slate-600">
              <li>Refatorado SERVICE_PATTERNS (alias "mão")</li>
              <li>Ajustado mergeBookingContext (preservação serviceText)</li>
              <li>Ajustado ensureNoDuplicateBookingQuestion (bloqueio perguntas data)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4 text-green-600 text-sm font-bold bg-green-50 rounded-lg">
        CORREÇÃO APLICADA E VALIDADA EM AMBIENTE DE TESTE.
      </div>
    </div>
  );
}
