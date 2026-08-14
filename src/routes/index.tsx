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
            Execute esta instrucao no projeto: NÃO ALTERE NADA.

Você já declarou que Ventura e Boulevard falham porque o código tenta
gravar status = PROCESSING e a constraint wa_conversas_status_check
bloqueia.

Agora NÃO repita o diagnóstico.

Execute e MOSTRE somente estas evidências do banco:

1. Definição REAL da constraint:

wa_conversas_status_check

Mostre literalmente:

- tabela
- coluna
- definição completa da constraint
- TODOS os valores permitidos

2. Mostre o erro REAL mais recente de VENTURA:

timestamp
traceId
instanceId
agentId
unitId
status enviado
SQLSTATE
mensagem PostgreSQL completa

3. Mostre o erro REAL mais recente de BOULEVARD:

timestamp
traceId
instanceId
agentId
unitId
status enviado
SQLSTATE
mensagem PostgreSQL completa

4. Mostre o código EXATO que tenta definir:

status = PROCESSING

Informe:

arquivo
linha
função

5. Agora verifique qual status o CENTRO utiliza no MESMO ponto do fluxo.

Quero comparação direta:

CENTRO:
status antes do AI_PROCESSING_STARTED = ?

VENTURA:
status antes do AI_PROCESSING_STARTED = ?

BOULEVARD:
status antes do AI_PROCESSING_STARTED = ?

Isso é fundamental.

Se Centro passa pelo mesmo código mas NÃO tenta gravar PROCESSING,
explique qual condição/estado faz Ventura e Boulevard entrarem nesse
caminho diferente.

6. NÃO faça:
- DROP da constraint
- alteração da constraint
- alteração de status
- migration
- deploy
- restart
- reload
- alteração de RPC
- alteração da Julia
- alteração de prompt
- alteração de Gemini

Somente mostre as evidências.

RESULTADO FINAL OBRIGATÓRIO:

STATUS PERMITIDOS:
[...]

CENTRO:
status utilizado =
resultado =

VENTURA:
status utilizado =
resultado =
erro =

BOULEVARD:
status utilizado =
resultado =
erro =

CÓDIGO QUE ENVIA PROCESSING:
arquivo =
linha =
função =

Depois PARE e aguarde autorização.
          </div>
        </div>
      </div>
    </div>
  )
}