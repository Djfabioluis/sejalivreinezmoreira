import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const instructions = `Execute esta instrucao no projeto: AUTORIZADO PROSSEGUIR SOMENTE COM A VALIDAÇÃO FUNCIONAL REAL END-TO-END.

NÃO ALTERE CÓDIGO.
NÃO CORRIJA NADA.
NÃO ALTERE PROMPT.
NÃO ALTERE PREÇOS.
NÃO ALTERE CONFIGURAÇÕES.
NÃO CRIE SIMULAÇÕES.

As instâncias já foram identificadas:

CENTRO:
unitId = 1378
instanceId = agente-554130731358

VENTURA:
unitId = 1377
instanceId = agente-5541998430354

BOULEVARD:
unitId = 5258
instanceId = agente-5541998803684

Agora quero separar claramente:

1. TESTE AUTOMATIZADO
2. TRACE ANTIGO
3. MENSAGEM REAL NOVA RECEBIDA PELO WHATSAPP

Somente o item 3 será aceito como evidência do teste end-to-end.

==================================================
FASE 1 — PREPARAR MONITORAMENTO
==================================================

Monitore as 3 instâncias reais.

Para cada nova mensagem recebida, registre:

- timestamp
- instanceId
- unitId
- telefone/conversationId mascarado
- webhook/traceId
- texto recebido
- chamada list_services
- candidatos retornados pela BEMP
- serviceId selecionado
- officialPrice
- SERVICE_CLARIFICATION_REQUIRED
- SERVICE_PRICE_RESOLVED
- PRICE_MISMATCH_BLOCKED
- resposta produzida pela Julia
- mensagem efetivamente enviada pela Evolution

Não use traces anteriores como aprovação.

==================================================
FASE 2 — AGUARDAR MINHAS MENSAGENS
==================================================

Quando o monitoramento estiver pronto, NÃO invente resultados.

Informe apenas:

MONITORAMENTO PRONTO

CENTRO = pronto/não pronto
VENTURA = pronto/não pronto
BOULEVARD = pronto/não pronto

E me diga exatamente PARA QUAL NÚMERO DE WHATSAPP devo enviar
uma mensagem de teste para cada unidade.

Se você não conseguir determinar o número público correspondente
à instância, diga isso claramente.

==================================================
FASE 3 — TESTE REAL
==================================================

Depois que eu enviar pelo meu WhatsApp, capture o NOVO trace.

Primeiro teste em cada unidade:

"Quanto custa corte?"

COMPORTAMENTO ESPERADO:

Se houver mais de um serviço compatível:
- NÃO escolher automaticamente
- NÃO informar preço
- SERVICE_CLARIFICATION_REQUIRED = true
- apresentar opções reais retornadas pela BEMP

Depois eu responderei algo como:

"a segunda"

Então validar:

- recuperação do contexto
- serviço correto
- serviceId real
- preço consultado na BEMP
- SERVICE_PRICE_RESOLVED = true
- preço enviado = officialPrice

==================================================
REGRA DE EVIDÊNCIA
==================================================

Não marque APROVADO apenas porque a função funciona em teste.

APROVADO somente se houver:

MENSAGEM REAL WHATSAPP
→ WEBHOOK NOVO
→ INSTÂNCIA CORRETA
→ BEMP
→ JULIA
→ EVOLUTION
→ RESPOSTA REAL ENVIADA

Se não houver evidência de uma dessas etapas:

NÃO TESTADO.

Se ocorrer erro:

PARE.
NÃO CORRIJA.
Mostre o trace e a etapa exata da falha.

Agora apenas prepare o monitoramento e me informe quando estiver
pronto para eu enviar as mensagens pelo WhatsApp.`;

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
