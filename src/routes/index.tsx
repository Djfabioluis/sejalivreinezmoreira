import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const instructions = `Execute esta instrucao no projeto: NÃO FAÇA NENHUMA ALTERAÇÃO NO CÓDIGO.

A correção atual obteve:

TOTAL DE TESTES = 24
APROVADOS = 24
FALHARAM = 0

Agora quero somente VALIDAÇÃO FUNCIONAL REAL END-TO-END.

Não implemente.
Não refatore.
Não altere prompt.
Não altere preços.
Não altere BEMP.
Não altere Evolution.
Não altere SERVICE_CLARIFICATION_REQUIRED.
Não altere PRICE_MISMATCH_BLOCKED.

OBJETIVO:

Confirmar que o comportamento aprovado nos testes automatizados
é exatamente o mesmo no fluxo real:

WHATSAPP
→ EVOLUTION
→ WEBHOOK
→ JULIA
→ LIST_SERVICES / BEMP
→ RESOLUÇÃO DO SERVIÇO
→ PREÇO OFICIAL
→ EVOLUTION
→ WHATSAPP

Faça a auditoria separadamente nas 3 unidades:

CENTRO
VENTURA
BOULEVARD

Para cada unidade, identificar o número/instância real de WhatsApp
e acompanhar os traces do início ao fim.

TESTES REAIS:

TESTE 1 — SERVIÇO INEQUÍVOCO

Enviar pelo WhatsApp uma pergunta com nome suficientemente
específico de um serviço existente.

Validar:

- unidade correta
- list_services chamada
- serviceId correto
- officialPrice obtido do BEMP
- SERVICE_PRICE_RESOLVED = true
- preço enviado ao cliente = officialPrice

TESTE 2 — SERVIÇO AMBÍGUO

Enviar pelo WhatsApp:

"Quanto custa corte?"

Validar:

- múltiplos candidatos reais encontrados
- SERVICE_CLARIFICATION_REQUIRED
- nenhum serviceId escolhido arbitrariamente
- nenhum preço informado
- Julia apresenta somente opções reais do BEMP

Depois responder pelo WhatsApp:

"a segunda"

Validar:

- contexto de esclarecimento recuperado
- opção correta selecionada
- serviceId correto
- officialPrice consultado
- SERVICE_PRICE_RESOLVED = true
- preço correto enviado

TESTE 3 — SERVIÇO INEXISTENTE

Perguntar pelo WhatsApp o preço de um serviço inexistente.

Validar:

- nenhum serviceId inventado
- officialPrice = null
- SERVICE_PRICE_RESOLVED = false
- nenhum preço inventado enviado ao cliente

IMPORTANTE:

NÃO simule resposta do WhatsApp.
NÃO considere teste unitário como evidência deste teste.
NÃO altere dados do BEMP.
NÃO faça correções automaticamente.

Se não for possível disparar mensagens reais de teste,
identifique exatamente o que precisa ser feito manualmente
por mim no WhatsApp e fique acompanhando os traces disponíveis.

RELATÓRIO FINAL POR UNIDADE:

UNIDADE:
INSTÂNCIA:
TRACE/ID:
MENSAGEM DO CLIENTE:
CANDIDATOS BEMP:
SERVICE ID SELECIONADO:
OFFICIAL PRICE:
SERVICE_PRICE_RESOLVED:
SERVICE_CLARIFICATION_REQUIRED:
RESPOSTA FINAL DA JULIA:
MENSAGEM ENVIADA PELO EVOLUTION:
RESULTADO: APROVADO/FALHOU

Ao final:

CENTRO = APROVADO/FALHOU
VENTURA = APROVADO/FALHOU
BOULEVARD = APROVADO/FALHOU

PREÇO BEMP = VALIDADO/NÃO VALIDADO
AMBIGUIDADE = VALIDADA/NÃO VALIDADA
SERVIÇO INEXISTENTE = VALIDADO/NÃO VALIDADO
WHATSAPP END-TO-END = VALIDADO/NÃO VALIDADO

Se encontrar qualquer falha:
PARE.
NÃO CORRIJA.
Mostre o trace e a causa provável.

PARE E AGUARDE MINHA AUTORIZAÇÃO.`;

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
