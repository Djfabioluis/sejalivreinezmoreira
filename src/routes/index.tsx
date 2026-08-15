import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: PARE. NÃO FAÇA NENHUMA ALTERAÇÃO.

O número informado como CENTRO está ERRADO.

Você informou:

CENTRO
instanceId = agente-554130731358
unitId = 1378
WhatsApp = +55 41 3073-1358

Mas esse número +55 41 3073-1358 pertence à unidade BOULEVARD.

NÃO use esse número como Centro.
NÃO execute teste ainda.
NÃO altere instâncias automaticamente.

Quero AUDITORIA REAL do mapeamento das 3 unidades.

Para cada unidade mostre:

UNIDADE
instanceId Evolution
instanceName Evolution
telefone conectado na Evolution
agentId
unitId
nome da unidade no banco
telefone oficial da unidade no banco
webhook configurado
status da instância

Tabela obrigatória:

UNIDADE | TELEFONE EVOLUTION | instanceId | agentId | unitId | NOME BANCO | TELEFONE BANCO | MAPEAMENTO CORRETO?

CENTRO
VENTURA
BOULEVARD

Depois faça o cruzamento por fonte:

1. Evolution API
2. tabela de agentes/instâncias
3. tabela de unidades
4. configuração do webhook
5. roteamento usado no inbound

Não resolva unidade pelo nome visual "Julia", "Bruno" ou pelo índice da lista.

Use os identificadores técnicos reais.

IMPORTANTE:

Verifique especificamente:

+55 41 3073-1358

e informe com evidência a qual unidade ele realmente pertence.

Não altere nada.

Ao final responda somente:

CENTRO:
telefone =
instanceId =
unitId =

VENTURA:
telefone =
instanceId =
unitId =

BOULEVARD:
telefone =
instanceId =
unitId =

MAPEAMENTO INCORRETO ENCONTRADO = SIM/NÃO

ONDE ESTÁ O ERRO =
(tabela/campo/configuração)

CORREÇÃO NECESSÁRIA =
(descrever somente, NÃO executar)

PARE e aguarde autorização.`;

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
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
          <p className="text-blue-700 text-sm">Auditoria forense de disponibilidade e horários da agenda.</p>
        </div>
      </div>
    </div>
  )
}
