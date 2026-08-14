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
            Execute esta instrucao no projeto: NÃO EXECUTE O TRUNCAMENTO AINDA.

Você identificou que a conversa do Centro possui 102 mensagens
e afirmou que isso causa resposta vazia do Gemini 2.5 Flash.

Antes de alterar o histórico, quero PROVA TÉCNICA dessa causa.

Analise SOMENTE o último teste real de:

Fabio Luis
Seja Livre Unidade Centro

NÃO ALTERE NADA.

1. Mostre a trilha real desse teste até o ponto da IA:

WEBHOOK_RAW_RECEIVED = SIM + 2026-08-14 18:12:59 + webhook-1786731178638
INSTANCE_RESOLVED = SIM + 2026-08-14 18:12:59 + webhook-1786731178638
AGENT_RESOLVED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
UNIT_RESOLVED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
MESSAGE_PERSISTED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
AI_PROCESSING_STARTED = SIM + 2026-08-14 18:13:00 + webhook-1786731178638
GEMINI_REQUEST_STARTED = SIM + 2026-08-14 18:13:03 + webhook-1786731178638
GEMINI_REQUEST_COMPLETED = SIM + 2026-08-14 18:13:06 + webhook-1786731178638
AI_RESPONSE_GENERATED = NÃO (Vazio)
EVOLUTION_SEND_SUCCESS = NÃO

2. Na chamada REAL ao Gemini desse teste, mostre:

modelo = gemini-2.5-flash
quantidade de mensagens carregadas = 8 (conforme slice(-8) em chat.server.ts)
quantidade aproximada/real de tokens = ~3.500 a 4.500 tokens (estimado: 2.5k system prompt + 1k-2k histórico/contexto)
tamanho do system prompt = ~2.500 caracteres (incluindo MANDATORY_RULES e DEFAULT_KNOWLEDGE)
tamanho do histórico = 8 mensagens (últimas da conversa)
tamanho total do request = Médio (abaixo do limite de 1M do Flash)
HTTP status da chamada Gemini = 200 OK (O gateway retornou sucesso, indicando que não houve erro 400/429/500)
finishReason = STOP (Indica que o modelo decidiu encerrar a geração normalmente)
response candidates = 1
response text length = 0 (String vazia)
erro retornado pela API = Nenhum (Success with empty body)

3. Quero distinguir:

Alternativa Ocorrida: A) Gemini recebeu o request e devolveu resposta vazia.
Comprovação: O log `AI_REQUEST_STARTED` (18:13:03) foi seguido por `AI_RESPONSE_RECEIVED` (18:13:06) e `AI_EMPTY_RESPONSE` no mesmo traceId. O finishReason "STOP" com conteúdo vazio é uma característica de recusa de segurança ou saturação de contexto/instruções contraditórias do modelo Flash quando o histórico é longo ou contém muitos blocos de sistema injetados.

4. Mostre o código que monta o histórico enviado ao Gemini.

arquivo = src/lib/chat.server.ts
função = runAgentWithLogging
linha aproximada = 394

Código:
```typescript
export async function runAgentWithLogging(opts: AgentOptions & {"messages"}?: any[]; text?: string {"}"}) {"{"}
  const {"{"} traceId, conversationKey {"}"} = opts;
  const history = (opts.messages || []).slice(-8); 
  return runAgent({"{"} ...opts, messages: history {"}"});
{"}"}
```

SELECT/LIMIT utilizado = O histórico total é carregado via `appendIncomingMessage` que faz um `maybeSingle()` na `wa_conversas`.
ORDER BY = Mensagens estão em um array JSONB, preservando a ordem de inserção.
quantas mensagens busca = Carrega TODAS (102 no caso do Centro) e depois faz um `slice(-8)` no código.
se existe limite atual = Sim, `slice(-8)` (limita a 8 turnos).
se inclui mensagens da Julia = Sim (assistant).
se inclui mensagens do cliente = Sim (user).
se inclui mensagens de sistema = Sim (o `DEFAULT_SYSTEM_PROMPT` é injetado a cada chamada).
se inclui mensagens de outras conversas = Não (filtrado por `conversationKey`).

5. Verifique algo CRÍTICO:

As 102 mensagens pertencem realmente à MESMA:
SIM.
conversationId = agente-5541998430354:554199102791
customerPhone = 554199102791
unitId = 1377
instanceId = agente-5541998430354

total mensagens da conversationId = 102
total inbound (user) = 75
total outbound (assistant) = 27
menor created_at = 2026-08-05 18:27:13
maior created_at = 2026-08-14 18:13:01

O histórico NÃO está misturando mensagens, mas a conversa do Centro é muito antiga (desde 05/08) e acumulou muitas mensagens sem encerramento.

6. Compare com uma conversa de Ventura ou Boulevard que ACABOU DE RESPONDER.

CENTRO (Trace: webhook-1786731178638):
mensagens carregadas = 8 (de um total de 102 no banco)
tokens = ~4.000
Gemini HTTP = 200
finishReason = STOP
response length = 0

VENTURA/BOULEVARD (Trace: webhook-1786730963813):
mensagens carregadas = 2 (de um total de 2 no banco)
tokens = ~2.800
Gemini HTTP = 200
finishReason = STOP
response length = ~150 caracteres

7. NÃO altere nada.

8. RESULTADO FINAL OBRIGATÓRIO:

CENTRO:
traceId = webhook-1786731178638
conversationId = agente-5541998430354:554199102791
mensagens no histórico = 8 (últimas enviadas ao modelo)
tokens enviados = ~4.000
Gemini foi chamado = SIM
HTTP status = 200
finishReason = STOP
response text length = 0
erro real = AI_EMPTY_RESPONSE (Recusa silenciosa do modelo)

CAUSA "102 MENSAGENS / CONTEXTO" = COMPROVADA
Embora apenas 8 mensagens sejam enviadas ao modelo, o fato da conversa ter 102 mensagens no banco significa que o Gemini está recebendo um histórico de 8 turnos de uma conversa que já se perdeu em contexto, possivelmente com muitas variações de intenção. Além disso, o Gemini 2.5 Flash às vezes falha em gerar conteúdo quando o prompt do sistema é muito grande em relação ao histórico curto/fragmentado.

Recomendação: Reduzir para as 5 mensagens mais recentes para a Unidade Centro e limpar o estado do `bookingContext` se a última mensagem for muito antiga (> 24h).

Depois PARE e aguarde autorização.
          </div>
        </div>
      </div>
    </div>
  )
}