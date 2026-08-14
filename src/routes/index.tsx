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
        Execute esta instrucao no projeto: O diagnóstico agora isolou o problema.

As mensagens REAIS estão entrando corretamente nas três unidades:

- Centro
- Ventura Shopping
- Shopping Boulevard

Portanto NÃO ALTERE:
- Evolution
- webhooks
- identificação de instância
- agentId
- unitId
- prompt da Julia
- Gemini
- memória
- fluxo de agendamento
- máquina de estados

O problema atual está na persistência/RPC append_wa_message.

NÃO crie fallback.
NÃO adicione try/catch.
NÃO ignore o erro.
NÃO crie outra função paralela.
NÃO faça correção por tentativa.

Quero corrigir a CAUSA RAIZ.

ETAPA 1 — INSPECIONAR O BANCO REAL

Execute consulta no PostgreSQL para listar TODAS as funções:

public.append_wa_message

Mostre:

- oid
- proname
- pg_get_function_identity_arguments
- pg_get_function_arguments
- pg_get_function_result

Quero saber exatamente quantas versões de
public.append_wa_message existem atualmente.

ETAPA 2 — VERIFICAR AS ASSINATURAS

Identifique:

A) assinatura antiga de 7 parâmetros
B) assinatura atual de 2 parâmetros

Mostre os nomes e tipos exatos.

Não altere nada ainda.

ETAPA 3 — AUDITORIA GLOBAL DO CÓDIGO

Faça busca em TODO o projeto por:

append_wa_message

Incluindo código server-side, workers e funções.

Para cada ocorrência mostre:

arquivo
função
quantidade de argumentos
nomes dos argumentos
assinatura esperada

Não considere somente fallback.server.ts.

ETAPA 4 — IDENTIFICAR A CHAMADA QUE AINDA FALHA

Nos logs do meu teste REAL mais recente, encontre o erro:

Could not find the function public.append_wa_message

Mostre:

timestamp
unidade
instanceId
agentId
unitId
arquivo/função que realizou a chamada
payload RPC enviado
nomes dos parâmetros enviados
erro completo retornado pelo Supabase/PostgREST

Isso é essencial.

Quero descobrir QUEM ainda está fazendo a chamada incompatível.

ETAPA 5 — SCHEMA CACHE

Verifique se o código já está correto mas o PostgREST está usando
schema cache antigo.

Se for cache, faça o reload oficial do schema do PostgREST/Supabase.

Não altere a estrutura da função somente para satisfazer cache antigo.

ETAPA 6 — SOMENTE DEPOIS CORRIGIR

Se encontrar uma chamada antiga no código:
corrija essa chamada para a assinatura REAL existente no banco.

Se encontrar função duplicada/obsoleta no banco:
primeiro informe qual é antes de remover.

Se for apenas schema cache:
recarregue o schema.

Todas as unidades devem usar EXATAMENTE o mesmo caminho de persistência.

ETAPA 7 — VALIDAÇÃO

Depois da correção, faça uma consulta final e mostre:

FUNÇÕES RPC EXISTENTES
| função | assinatura | status |

CHAMADAS NO CÓDIGO
| arquivo | função chamadora | assinatura utilizada |

E confirme que NÃO existe mais nenhuma chamada com a assinatura antiga.

Não declare Centro/Ventura/Boulevard funcionando ainda.

Depois dessa correção EU farei novos testes reais pelo WhatsApp.

Só consideraremos resolvido quando uma mensagem real de cada unidade atingir:

WEBHOOK_RAW_RECEIVED
→ INSTANCE_RESOLVED
→ AGENT_RESOLVED
→ UNIT_RESOLVED
→ MESSAGE_PERSISTED
→ AI_PROCESSING_STARTED
→ AI_RESPONSE_GENERATED
→ EVOLUTION_SEND_SUCCESS
      </div>
    </div>
  </div>
</div>
  )
}
