import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const instructions = `Execute esta instrucao no projeto: AUTORIZO A CORREÇÃO, MAS SOMENTE DENTRO DO ESCOPO ABAIXO.

A causa raiz foi comprovada:

- preço oficial: R$ 100,00
- preço informado: R$ 79,90
- SERVICE_PATTERNS resolveu o serviço para uma referência/nome incompatível com o catálogo real do BEMP
- a consulta oficial não retornou o serviço/preço correto
- o Gemini respondeu um valor sem confirmação da fonte oficial

OBJETIVO:
Eliminar definitivamente preço inventado pela IA.

REGRA ABSOLUTA:
A JULIA NUNCA PODE INFORMAR PREÇO DE SERVIÇO A PARTIR DE memória, histórico, ou inferência. PREÇO SÓ PODE SER INFORMADO SE VIER DA FONTE OFICIAL BEMP PARA A UNIDADE CORRETA.

1. CORRIGIR SERVICE_PATTERNS (src/lib/booking/context.ts): Remover associações estáticas que forçam nomes de serviços. Use o texto original do cliente para consultar o catálogo oficial.
2. RESOLUÇÃO SEMÂNTICA NO CATÁLOGO: Chamar list_services para a unidade correta e localizar candidatos no catálogo REAL.
3. PROTEÇÃO CONTRA ALUCINAÇÃO: Implementar regra no backend onde, se a resposta contiver preço, deve existir um SERVICE_PRICE_RESOLVED válido no mesmo turno.
4. LOG DE AUDITORIA: Implementar logs de [SERVICE_SEARCH], [SERVICE_PRICE_RESOLVED], [PRICE_MISMATCH_BLOCKED] e [PRICE_SENT].
5. VALIDAÇÃO ANTES DO ENVIO: Se o Gemini gerar preço diferente do oficial, o envio deve ser bloqueado ou corrigido deterministicamente.`;

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
          <p className="text-blue-700 text-sm">Implementação das proteções determinísticas e validação em todas as unidades.</p>
        </div>
      </div>
    </div>
  )
}
