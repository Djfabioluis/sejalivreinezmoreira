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
            Execute esta instrucao no projeto: NÃO FAÇA ALTERAÇÕES AINDA.

O diagnóstico confirmou que existe uma tentativa REAL de chamar
append_wa_message com 7 parâmetros:

p_customer_context
p_increment_unread
p_instance
p_message
p_new_status
p_phone
p_phone_number

Agora NÃO quero hipótese sobre cache ou worker antigo.

Quero localizar EXATAMENTE QUEM está fazendo essa chamada.

1. Faça busca global em TODO o projeto, incluindo:

- src/
- supabase/functions/
- edge functions
- server functions
- workers
- jobs
- follow-up
- recovery
- webhook handlers
- conversation services
- agent services
- fallback
- arquivos compilados/configurações disponíveis

Procure por:

append_wa_message

e também individualmente por:

p_customer_context
p_increment_unread
p_new_status
p_phone_number

2. Para CADA ocorrência encontrada, mostre:

arquivo
linha
função
assinatura utilizada
quantidade de parâmetros
se está ativa no fluxo atual

NÃO altere nada.

3. Depois consulte os logs da ocorrência REAL mais recente do erro
"Could not find the function public.append_wa_message".

Correlacione pelo traceId/messageId e mostre:

timestamp
traceId
messageId
instanceId
agentId
unitId
arquivo/função de origem
runtime
deployment/function responsável

4. Quero diferenciar obrigatoriamente:

ERRO GERADO PELO CÓDIGO ATUAL
versus
ERRO GERADO POR WORKER/DEPLOYMENT ANTIGO
versus
ERRO GERADO POR SCHEMA CACHE DO POSTGREST.

Não conclua qual deles é sem evidência.

5. Faça também uma auditoria da função existente no banco.

Mostre TODAS as assinaturas atualmente registradas para:

public.append_wa_message

incluindo:

oid
proname
proargnames
proargtypes
número de argumentos

6. IMPORTANTE:

Não reinicie workers.
Não faça reload.
Não recrie RPC.
Não exclua função.
Não altere banco.
Não altere Julia.
Não altere Gemini.
Não altere prompt.
Não altere agendamento.

PRIMEIRO LOCALIZE O CHAMADOR REAL.

7. Depois volte ao problema das unidades e mostre os últimos testes
separadamente:

CENTRO
VENTURA
BOULEVARD

Para cada uma:

instanceId
agentId
unitId
WEBHOOK_RAW_RECEIVED
MESSAGE_PERSISTED
AI_PROCESSING_STARTED
AI_RESPONSE_GENERATED
EVOLUTION_SEND_SUCCESS

Se algum checkpoint não existir, marque AUSENTE.

Especial atenção ao BOULEVARD:
não considere mensagem aparecendo na Caixa de Entrada como prova
de que a IA respondeu.

RESULTADO FINAL:

Tabela 1:
Unidade | instanceId | agentId | unitId | último checkpoint | resposta entregue?

Tabela 2:
append_wa_message | arquivo chamador | função | parâmetros | runtime/deployment | traceId

Somente depois dessas evidências apresente a causa raiz provável.

NÃO EXECUTE A CORREÇÃO AINDA.
          </div>
        </div>
      </div>
    </div>
  )
}