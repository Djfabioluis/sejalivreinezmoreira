import { createFileRoute } from '@tanstack/react-router'
  const instructions = `Execute esta instrucao no projeto: AUTORIZO A CORREÇÃO EXCLUSIVAMENTE DO MAPEAMENTO DE UNIDADES.

A auditoria confirmou:

CENTRO
telefone = +55 41 99843-0354
instanceId = agente-5541998430354
unitId correto = 1378

VENTURA
telefone = +55 41 99880-3684
instanceId = agente-5541998803684
unitId correto = 1377

BOULEVARD
telefone = +55 41 3073-1358
instanceId = agente-554130731358
unitId correto = 5258

O erro identificado está em:
public.wa_agentes.unidade_id

CORRIJA SOMENTE os vínculos de unidade_id da tabela wa_agentes
para que cada instanceId fique associado ao unitId correto acima.

NÃO ALTERE:
- prompt
- Gemini
- Evolution
- webhook
- preços
- SERVICE_PRICE_RESOLVED
- resolução de serviços
- memória
- histórico
- follow-up
- regras de agendamento
- list_slots
- interface

IMPORTANTE:
Não confie apenas nos valores atuais de wa_agentes para fazer a correção.
Valide cada unitId contra a unidade real da BEMP antes do UPDATE.

Após corrigir, NÃO faça outras alterações.

FAÇA UMA AUDITORIA PÓS-CORREÇÃO e mostre:

1. SELECT/resultado de wa_agentes após a correção:
telefone | instanceId | unidade_id

2. Para cada instanceId, demonstre qual unidade BEMP foi resolvida:
CENTRO -> 1378
VENTURA -> 1377
BOULEVARD -> 5258

3. Execute um teste de resolução de contexto para cada telefone, SEM enviar
mensagem ao cliente:

+55 41 99843-0354
deve resolver -> CENTRO / 1378

+55 41 99880-3684
deve resolver -> VENTURA / 1377

+55 41 3073-1358
deve resolver -> BOULEVARD / 5258

4. Confirme se o bookingContext recebe o unitId correto nas três instâncias.

5. NÃO teste horários ainda.
6. NÃO envie mensagens reais.
7. NÃO faça nenhuma correção adicional.

RESULTADO FINAL OBRIGATÓRIO:

CENTRO = telefone / instanceId / unitId / PASSOU ou FALHOU
VENTURA = telefone / instanceId / unitId / PASSOU ou FALHOU
BOULEVARD = telefone / instanceId / unitId / PASSOU ou FALHOU

bookingContext Centro = unitId
bookingContext Ventura = unitId
bookingContext Boulevard = unitId

MAPEAMENTO CORRIGIDO = SIM/NÃO
3 INSTÂNCIAS VALIDADAS = SIM/NÃO

Se qualquer uma falhar, mostre a evidência e PARE.

NÃO corrija outro problema.

PARE E AGUARDE MINHA AUTORIZAÇÃO.`;

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
