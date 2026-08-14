import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
            Seja Livre AI Platform
          </h1>
          <div className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto whitespace-pre-wrap text-left bg-muted/50 p-6 rounded-lg border border-border font-mono text-xs">
            Execute esta instrucao no projeto: Agora temos uma causa técnica concreta:

Could not find the function public.append_wa_message

O diagnóstico mostrou que ainda existe execução tentando chamar
append_wa_message com a assinatura antiga de 7 parâmetros.

NÃO quero contornar esse erro.
NÃO quero apenas capturar a exception e continuar.
Quero eliminar a origem definitivamente.

Faça uma auditoria global no projeto e no runtime.

1. LOCALIZE TODAS AS CHAMADAS

Procure em todo o projeto por:

append_wa_message
rpc('append_wa_message'
rpc("append_wa_message"

Incluindo:
- server functions
- edge functions
- workers
- processor.server.ts
- conversation.server.ts
- agent.server.ts
- webhook handlers
- follow-up
- filas/retries
- código legado

Mostre arquivo + função + quantidade de parâmetros de CADA chamada encontrada.

2. AUDITE A FUNÇÃO REAL NO BANCO

Consulte diretamente o PostgreSQL/Supabase e mostre a assinatura atualmente existente de:

public.append_wa_message

Quero ver:
- nome dos parâmetros
- tipos
- ordem
- quantidade de parâmetros
- retorno

Não presuma a assinatura pelo código TypeScript.

3. COMPARE BANCO X CÓDIGO

Identifique exatamente qual chamada ainda está enviando os 7 parâmetros antigos.

Se houver mais de uma versão da função ou migration divergente, identificar.

4. VERIFIQUE RUNTIME ANTIGO

Como Centro funciona e Ventura/Boulevard apresentam o erro, verifique se existe:

- worker antigo ainda executando;
- Edge Function não redeployada;
- versão antiga do processor;
- fila contendo job criado por código antigo;
- bundle/cache antigo;
- função duplicada;
- webhook apontando para endpoint/deployment diferente.

Compare obrigatoriamente:

CENTRO
VENTURA
BOULEVARD

Quero saber qual endpoint/processador/runtime recebe cada uma.

5. CORREÇÃO

Depois de identificar a chamada antiga:

corrija SOMENTE a incompatibilidade da RPC.

Todas as instâncias devem utilizar a MESMA função e a MESMA assinatura.

Não criar comportamento diferente por unidade.

Não mascarar AI_REPLY_HISTORY_PERSISTENCE_FAILED.

Depois da correção, faça redeploy/reload dos componentes server-side necessários para eliminar runtime antigo.

6. NÃO ALTERAR

Não alterar:
- prompt da Julia
- Gemini
- memória
- regras de atendimento
- máquina de estados
- fluxo de agendamento
- identificação das unidades
- configuração funcional da unidade Centro
- regras de transferência para humano

7. VALIDAÇÃO

Depois da correção NÃO use somente teste manual de envio.

Aguarde meus novos testes reais de WhatsApp.

Antes disso, me entregue:

TABELA 1 — RPC
Local da chamada | parâmetros usados | correto/incorreto | correção

TABELA 2 — RUNTIME
Unidade | instanceId Evolution | agentId | unitId | endpoint webhook | worker/processador | versão/deployment

TABELA 3 — SITUAÇÃO
Centro | Ventura | Boulevard

Para cada uma mostrar o último checkpoint REAL conhecido.

IMPORTANTE:
Não declare que "a Julia está funcionando" sem um novo teste inbound real chegando até EVOLUTION_SEND_SUCCESS.
          </div>
        </div>
      </div>
    </div>
  )
}
