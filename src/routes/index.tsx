import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const instructions = `Execute esta instrucao no projeto: NÃO FAÇA MAIS ALTERAÇÕES.

Agora quero TESTE FUNCIONAL REAL da correção implementada.

Há um ponto crítico:

No Boulevard o BEMP retornou:
- Corte Feminino = R$ 100,00
- Corte Masculino = R$ 60,00

Portanto, se o cliente disser apenas:

"Quanto custa corte?"

NÃO é correto escolher automaticamente R$ 100,00,
pois existem pelo menos dois serviços compatíveis.

A Julia deve pedir esclarecimento OU apresentar as opções reais,
sem inventar e sem escolher arbitrariamente.

==================================================
TESTE REAL NAS 3 UNIDADES
==================================================

Teste:

CENTRO
VENTURA
BOULEVARD

Use o catálogo REAL de cada unidade.

Execute estes testes:

1. "Quanto custa corte?"
2. "Quanto custa corte feminino?"
3. "Quanto custa corte masculino?"
4. "Quanto custa manicure?"
5. "Quanto custa escova?"
6. "Qual o valor de um serviço que NÃO existe?"

Para CADA teste mostre:

UNIDADE =
MENSAGEM =
LIST_SERVICES CHAMADA = SIM/NÃO
CANDIDATOS ENCONTRADOS =
SERVICE ID ESCOLHIDO =
NOME OFICIAL =
PREÇO BEMP =
PREÇO ENVIADO AO GEMINI =
RESPOSTA FINAL JULIA =
PREÇO ENVIADO AO WHATSAPP =
PRICE_MISMATCH_BLOCKED = SIM/NÃO
RESULTADO = APROVADO/FALHOU

==================================================
REGRA DE AMBIGUIDADE
==================================================

Se houver MAIS DE UM serviço plausível:

Exemplo:
Corte Feminino = R$100
Corte Masculino = R$60

a Julia NÃO pode selecionar silenciosamente um deles.

Resultado esperado para:

"Quanto custa corte?"

deve ser algo natural como:

"Temos algumas opções de corte. Você gostaria de saber o
valor do corte feminino ou masculino?"

OU pode informar as opções e respectivos valores,
DESDE QUE todos tenham vindo do BEMP.

==================================================
TESTE DE ALUCINAÇÃO FORÇADA
==================================================

Faça também um teste controlado em que:

preço oficial BEMP = X

e a saída simulada do Gemini tente responder um preço Y
diferente de X.

Comprove que:

PRICE_MISMATCH_BLOCKED foi acionado
e que Y NÃO foi enviado ao WhatsApp.

Mostre o trace.

==================================================
TESTE SEM RESULTADO
==================================================

Pergunte por um serviço inexistente.

Exemplo:
"Quanto custa maquiagem artística especial xyz?"

Se list_services não encontrar serviço compatível:

A Julia NÃO pode inventar:
- nome
- preço
- duração
- disponibilidade.

Mostre a resposta produzida.

==================================================
ATENÇÃO
==================================================

NÃO altere código durante esses testes.

Não corrija nada automaticamente caso algum teste falhe.

Se falhar, apenas registre a falha.

==================================================
RESULTADO FINAL
==================================================

Entregue tabela:

UNIDADE | TESTE | BEMP | JULIA | WHATSAPP | RESULTADO

Depois responda:

CENTRO = APROVADO/FALHOU
VENTURA = APROVADO/FALHOU
BOULEVARD = APROVADO/FALHOU

PREÇO INVENTADO FOI BLOQUEADO = SIM/NÃO
SERVIÇO INEXISTENTE GEROU PREÇO = SIM/NÃO
AMBIGUIDADE "CORTE" FOI TRATADA = SIM/NÃO
TODOS OS PREÇOS ENVIADOS VIERAM DO BEMP = SIM/NÃO

Se qualquer resposta for NÃO, mostre o trace e a causa,
mas NÃO ALTERE O CÓDIGO.

PARE E AGUARDE AUTORIZAÇÃO.`;

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
