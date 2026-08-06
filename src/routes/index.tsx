import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
const StripeEmbeddedCheckout = lazy(() =>
  import("@/components/StripeEmbeddedCheckout").then((m) => ({
    default: m.StripeEmbeddedCheckout,
  })),
);
import {
  Flower2,
  MessageCircle,
  CalendarClock,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Bot,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seja Livre AI Platform — Gestão Inteligente para Salões" },
      {
        name: "description",
        content:
          "A inteligência que administra, agenda, vende e fideliza clientes. Plataforma Inteligente para Gestão de Salões de Beleza.",
      },
      { property: "og:title", content: "Seja Livre AI Platform — Inteligência Artificial no WhatsApp" },
      {
        property: "og:description",
        content:
          "Julia AI atende, agenda, confirma e faz cross-sell no WhatsApp da sua clínica ou salão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

import { PLAN_METADATA, PLANS as CENTRAL_PLANS, type PlanKey, type Cycle } from "@/lib/plans";

function LandingPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<null | { email?: string }>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  useEffect(() => {
    // Retoma o destino pretendido salvo antes do login social (redirect_uri é a origem pública).
    const resumeNext = () => {
      try {
        const stored = localStorage.getItem("auth:next");
        if (!stored) return false;
        localStorage.removeItem("auth:next");
        if (!stored.startsWith("/") || stored.startsWith("//") || stored === "/") return false;
        window.location.replace(stored);
        return true;
      } catch {
        return false;
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        if (resumeNext()) return;
        setSession({ email: data.user.email ?? undefined });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s && resumeNext()) return;
      setSession(s ? { email: s.user.email ?? undefined } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  function handleSubscribe(priceId: string) {
    if (!session) {
      navigate({
        to: "/auth",
        search: { next: `/?assinar=${priceId}` },
      });
      return;
    }
    setSelectedPrice(priceId);
    setTimeout(() => {
      document
        .getElementById("checkout-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  // Auto-open checkout after login redirect back with ?assinar=
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("assinar");
    if (auto) {
      setSelectedPrice(auto);
      setTimeout(
        () =>
          document
            .getElementById("checkout-section")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 
        Execute esta instrucao no projeto: CORREÇÃO CRÍTICA — CONSULTA DE CLIENTE E PLANO POR CPF NO BEMP

PROBLEMA

A IA solicita o CPF, mas não encontra clientes que possuem plano de assinatura no BEMP.

OBJETIVO

Corrigir o fluxo completo:

CPF informado
→ validação
→ normalização
→ busca do cliente no BEMP
→ identificação inequívoca do cliente
→ consulta dos planos/assinaturas
→ validação do status e saldo
→ resolução do serviço do plano
→ continuação do agendamento.

Não alterar regras de agendamento.

Não usar dados simulados.

Não publicar automaticamente.

==================================================
1. RASTREAR O FLUXO ATUAL
==================================================

Localizar todas as funções relacionadas a:

getCustomerByCPF
get_customer_by_cpf
getCustomerActivePlans
get_customer_active_plans
lookupCustomer
searchCustomer
subscription
plan
assinatura
cpf

Mapear:

- onde a IA chama a tool;
- schema de entrada;
- normalização;
- função BempService;
- endpoint real;
- formato da resposta;
- filtro de plano;
- retorno para a IA.

Não criar outra implementação paralela antes de localizar a existente.

==================================================
2. CPF SEMPRE COMO STRING
==================================================

CPF nunca pode ser tratado como number.

Proibido:

Number(cpf)
parseInt(cpf)
+cpf

Usar exclusivamente string.

Motivo:

- preservar zeros à esquerda;
- evitar transformação;
- impedir perda de precisão ou formatação.

Criar tipo:

type NormalizedCPF = string;

==================================================
3. NORMALIZAÇÃO
==================================================

Criar função única:

normalizeCPF(input: string): string

Ela deve:

- remover tudo que não seja dígito;
- preservar exatamente 11 dígitos;
- aplicar trim antes da limpeza;
- não retornar CPF formatado;
- não registrar o valor completo.

Exemplo:

"123.456.789-09"
→
"12345678909"

Aceitar CPF recebido como:

- texto simples;
- mensagem com pontuação;
- frase como “meu CPF é 123...”;
- espaços e quebras de linha.

Extrair somente quando existir exatamente um candidato válido de 11 dígitos.

==================================================
4. VALIDAR CPF
==================================================

Criar ou reutilizar:

isValidCPF(cpf)

Validar:

- 11 dígitos;
- dígitos verificadores;
- bloquear sequências repetidas:
  00000000000
  11111111111
  etc.

Se inválido:

retornar:

{
  success: false,
  code: "INVALID_CPF"
}

Não chamar o BEMP.

==================================================
5. TOOL E SCHEMA
==================================================

A tool deve receber:

{
  cpf: z.string()
}

Não aceitar CPF opcional quando o fluxo exige validação.

A tool deve retornar formato estruturado:

{
  success: true,
  customer: {
    id,
    name
  },
  plans: [...]
}

ou:

{
  success: false,
  code:
    | "INVALID_CPF"
    | "CUSTOMER_NOT_FOUND"
    | "MULTIPLE_CUSTOMERS_FOUND"
    | "NO_ACTIVE_PLAN"
    | "PLAN_NO_BALANCE"
    | "BEMP_UNAUTHORIZED"
    | "BEMP_RATE_LIMITED"
    | "BEMP_UNAVAILABLE"
    | "BEMP_INVALID_RESPONSE",
  message
}

Não retornar array vazio como resposta genérica para qualquer falha.

==================================================
6. ENDPOINT REAL DO BEMP
==================================================

Verificar na integração atual qual endpoint realmente aceita CPF.

Não presumir o caminho.

Inspecionar chamadas já existentes e documentação/configuração do projeto.

Confirmar:

- método HTTP;
- nome do parâmetro:
  cpf
  document
  document_number
  tax_id
  query
  search
  ou equivalente;
- CPF com ou sem pontuação;
- header de autenticação;
- salon/unit necessário;
- estrutura da resposta.

Registrar durante o teste, de forma sanitizada:

- URL sem token;
- método;
- nome do parâmetro;
- status HTTP;
- chaves do primeiro nível;
- quantidade de resultados.

Não registrar CPF completo.

==================================================
7. NÃO LIMITAR BUSCA À UNIDADE ERRADA
==================================================

O cadastro ou o plano pode estar associado a outra unidade ou existir globalmente no BEMP.

Separar:

BUSCA DE IDENTIDADE DO CLIENTE
→ buscar pelo CPF no escopo exigido pelo BEMP.

BUSCA DO PLANO
→ consultar planos do cliente identificado.

UNIDADE DO AGENDAMENTO
→ validar depois se o benefício pode ser usado na unidade atual.

Não concluir “cliente não encontrado” apenas porque ele não apareceu na unidade atual.

Caso a API exija unidade para busca, tentar somente os escopos permitidos e documentados, sem consultas indiscriminadas.

==================================================
8. CLIENTE E PLANO PODEM ESTAR EM ENDPOINTS DIFERENTES
==================================================

Não presumir que a busca do cliente já retorna as assinaturas.

Fluxo correto:

const customer = await bemp.findCustomerByCPF(cpf);

const plans = await bemp.getCustomerSubscriptions(
  customer.id
);

Se a resposta do cliente já incluir planos, normalizar pelo mesmo contrato.

Não procurar apenas:

customer.plans

Verificar estruturas como:

subscriptions
memberships
benefits
contracts
customer_plans
data.subscriptions
data.customer.subscriptions

==================================================
9. DESEMPACOTAR RESPOSTAS ANINHADAS
==================================================

Criar parser validado por Zod para os formatos reais.

Suportar somente formatos confirmados, por exemplo:

{
  data: [...]
}

{
  data: {
    customers: [...]
  }
}

{
  customer: {...}
}

{
  results: [...]
}

Não usar `asArray()` genérico que silenciosamente retorna [] em resposta desconhecida.

Se o formato não for reconhecido:

{
  success: false,
  code: "BEMP_INVALID_RESPONSE"
}

Registrar as chaves recebidas, sem dados pessoais.

==================================================
10. IDENTIFICAÇÃO INEQUÍVOCA
==================================================

Comparar o CPF normalizado retornado pelo BEMP com o informado.

Não aceitar o primeiro resultado arbitrariamente.

Se nenhum resultado corresponder:

CUSTOMER_NOT_FOUND

Se mais de um cadastro corresponder ao mesmo CPF:

MULTIPLE_CUSTOMERS_FOUND

Nesse caso:

- não escolher sozinho;
- encaminhar para atendimento humano;
- registrar inconsistência cadastral.

==================================================
11. CONSULTAR PLANOS PELO CUSTOMER ID
==================================================

Depois de identificar o cliente, usar o ID oficial do BEMP.

Não consultar plano somente pelo CPF novamente quando a API espera customerId.

Retorno normalizado:

{
  id,
  name,
  status,
  validFrom,
  validUntil,
  availableUses,
  totalUses,
  unitIds,
  benefits
}

Validar cada campo conforme a resposta real.

==================================================
12. NORMALIZAR STATUS DOS PLANOS
==================================================

Mapear status reais do BEMP para valores internos:

ACTIVE
INACTIVE
CANCELED
EXPIRED
SUSPENDED
NO_BALANCE
UNKNOWN

Reconhecer, após confirmar os valores reais:

ativo
active
vigente
enabled
cancelado
canceled
cancelled
vencido
expired
suspenso
suspended

Não depender de igualdade com uma única palavra.

Quando status desconhecido:

- não assumir ativo;
- registrar UNKNOWN;
- encaminhar para validação humana quando necessário.

==================================================
13. VALIDADE E SALDO
==================================================

Um plano só é utilizável quando:

- status normalizado = ACTIVE;
- data atual dentro da validade;
- saldo/utilizações disponíveis > 0, quando essa regra existir;
- benefício aplicável;
- não houver bloqueio retornado pelo BEMP.

Não tratar `availableUses = null` como zero sem confirmar o contrato.

Diferenciar:

- plano ilimitado;
- saldo não informado;
- saldo zero.

==================================================
14. MAPEAMENTO DO SERVIÇO
==================================================

Após encontrar plano válido:

Plano de manicure
→ Manicure Plano Beauty

Plano de escova
→ Escova Plano Beauty

Plano de hidratação e escova
→ Hidratação e Escova

Normalizar nome do plano:

- lowercase;
- sem acentos;
- espaços normalizados;
- correspondência exata primeiro;
- aliases centralizados.

Não mapear pelo texto livre da IA.

Criar configuração central:

SUBSCRIPTION_SERVICE_MAP

==================================================
15. RESOLVER SERVIÇO NA UNIDADE ATUAL
==================================================

Depois de identificar o benefício:

1. resolver unidade efetiva da conversa;
2. buscar serviços reais dessa unidade;
3. localizar o serviço mapeado;
4. obter o ID específico da unidade;
5. listar profissionais;
6. listar horários.

Não reutilizar serviceId de outra unidade.

Se o serviço de plano não existir na unidade:

SERVICE_NOT_AVAILABLE_IN_UNIT

Não substituir silenciosamente pelo serviço comum.

==================================================
16. NÃO CONFIAR NA MEMÓRIA PARA VALIDAR PLANO
==================================================

Memória pode informar que a cliente já teve plano, mas a decisão atual deve vir do BEMP.

Ordem:

BEMP atual
→ informação confirmada atual

Memória
→ apenas contexto auxiliar

Não informar plano ativo sem consulta bem-sucedida.

==================================================
17. NÃO SALVAR CPF COMPLETO EM CONTEXTO OU LOG
==================================================

No customer_context, preferir:

cpfValidated: true
bempCustomerId
cpfLast4
planCheckedAt

Não salvar CPF completo em texto aberto.

Se o sistema realmente precisar persistir o CPF:

- usar mecanismo seguro definido pelo projeto;
- limitar acesso;
- não incluir em logs;
- mascarar no frontend.

==================================================
18. ERROS DO BEMP
==================================================

No BempService, diferenciar:

HTTP 401/403
→ BEMP_UNAUTHORIZED

HTTP 404
→ CUSTOMER_NOT_FOUND somente se o endpoint usar 404 para isso.

HTTP 429
→ BEMP_RATE_LIMITED

HTTP 500/502/503/504
→ BEMP_UNAVAILABLE

timeout
→ BEMP_UNAVAILABLE com retryable true

JSON inválido ou schema inesperado
→ BEMP_INVALID_RESPONSE

Não converter todos esses casos em CUSTOMER_NOT_FOUND.

==================================================
19. RETRY
==================================================

Retry somente para falhas transitórias:

- timeout;
- 429, respeitando limite;
- 502;
- 503;
- 504.

Não repetir automaticamente:

- CPF inválido;
- 401;
- 403;
- cliente inexistente;
- plano inexistente.

Limitar tentativas e usar backoff.

==================================================
20. RESPOSTA PARA A IA
==================================================

A tool deve retornar apenas dados estruturados e seguros.

Exemplo de sucesso:

{
  "success": true,
  "customer": {
    "id": "abc",
    "name": "Maria"
  },
  "activePlans": [
    {
      "id": "plan-1",
      "name": "Plano de Manicure",
      "serviceName": "Manicure Plano Beauty",
      "availableUses": 2
    }
  ]
}

A IA responde with linguagem natural.

A tool não envia WhatsApp diretamente.

==================================================
21. RESPOSTAS AO CLIENTE
==================================================

CPF inválido:

“Não consegui validar esse CPF. Pode conferir e enviar novamente, por favor?”

Cliente não encontrado:

“Não encontrei um cadastro com esse CPF. Pode conferir o número ou prefere que eu encaminhe para nossa equipe?”

Cliente encontrado sem plano ativo:

“Encontrei seu cadastro, mas não localizei um plano ativo no momento. Posso ajudar com um agendamento convencional?”

BEMP indisponível:

“Não consegui consultar seu plano agora. Vou encaminhar essa validação para nossa equipe para você não ficar sem atendimento.”

Não dizer “não possui plano” quando o BEMP estiver indisponível.

==================================================
22. LOGS DE DIAGNÓSTICO
==================================================

Registrar:

cpf_received
cpf_normalized
cpf_validation_failed
bemp_customer_lookup_started
bemp_customer_lookup_completed
bemp_customer_not_found
bemp_multiple_customers
bemp_subscription_lookup_started
bemp_subscription_lookup_completed
bemp_subscription_not_found
bemp_subscription_active
bemp_subscription_no_balance
bemp_invalid_response
subscription_service_resolved
subscription_lookup_failed

Nos logs usar apenas:

cpfLast4
traceId
conversationId
unitId
customerId mascarado
status HTTP
responseShape

==================================================
23. TESTE COM DADO REAL CONTROLADO
==================================================

Usar um CPF de teste previamente confirmado no BEMP com plano ativo.

Não exibir o CPF no relatório.

Comprovar:

1. CPF normalizado;
2. endpoint chamado;
3. cliente localizado;
4. customerId retornado;
5. endpoint de assinaturas chamado;
6. plano encontrado;
7. status normalizado;
8. saldo validado;
9. serviço mapeado;
10. serviço resolvido na unidade.

==================================================
24. TESTES AUTOMATIZADOS
==================================================

Criar testes:

1. CPF formatado válido.
2. CPF somente números.
3. CPF com zero inicial.
4. CPF inválido.
5. cliente não encontrado.
6. múltiplos clientes.
7. cliente encontrado sem plano.
8. plano ativo.
9. plano vencido.
10. plano cancelado.
11. plano suspenso.
12. plano sem saldo.
13. plano ilimitado.
14. resposta aninhada.
15. resposta inválida.
16. BEMP 401.
17. BEMP 429.
18. BEMP 500.
19. timeout.
20. plano ativo em outra unidade.
21. serviço do plano inexistente na unidade.
22. mapeamentos Manicure, Escova e Hidratação e Escova.

==================================================
25. ENTREGA
==================================================

Ao concluir informar:

1. causa raiz exata;
2. endpoint real usado para localizar cliente;
3. nome real do parâmetro do CPF;
4. endpoint usado para assinaturas;
5. formato real das respostas;
6. status reais encontrados;
7. arquivos alterados;
8. schemas criados;
9. logs do teste mascarados;
10. testes;
11. build;
12. typecheck;
13. lint;
14. não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

Não declarar corrigido apenas porque a função retorna sem erro.

É obrigatório comprovar, com um CPF de teste conhecido no BEMP, que o cliente e o plano ativo foram encontrados e que o serviço correto foi resolvido.
      */}

      <div className="bg-green-600 text-white p-2 text-center text-xs font-medium">
        Sistema otimizado: cache de permissões e credenciais ativado para maior velocidade.
      </div>
      <PaymentTestModeBanner />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Flower2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-lg leading-none">Seja Livre</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Platform
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground">
              Recursos
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground">
              Planos
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Button asChild variant="default" size="sm">
                <Link to="/painel">Ir para o painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ next: "/painel" }}>Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <a href="#planos">Assinar</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              IA humanizada • 24h no WhatsApp
            </Badge>
            <h1 className="font-display text-4xl leading-tight sm:text-7xl">
              Seja Livre AI Platform
            </h1>
            <h2 className="mt-4 text-2xl font-display text-primary italic">
              "A inteligência que administra, agenda, vende e fideliza clientes."
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              Plataforma Inteligente para Gestão de Salões de Beleza. 
              Julia AI responde seus clientes 24 horas, marca no sistema Bemp,
              confirma agendamento e faz cross-sell automático.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#planos">Ver planos</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#recursos">Como funciona</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sem trial. Cancele quando quiser pelo portal do cliente.
            </p>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="border-t border-border/60 bg-card/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl sm:text-4xl">
            Tudo o que sua recepção precisa, automatizado.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "WhatsApp com IA humanizada",
                text: "Atende texto e áudio, entende contexto e nunca soa robótico. Escala como se fossem 5 recepcionistas.",
              },
              {
                icon: CalendarClock,
                title: "Agenda integrada (Bemp)",
                text: "Consulta serviços, profissionais, horários e cria o agendamento direto no seu sistema.",
              },
              {
                icon: Sparkles,
                title: "Cross-sell configurável",
                text: "Ao final de cada agendamento, oferece serviços complementares com regras que você define.",
              },
              {
                icon: Bot,
                title: "Confirmações e lembretes",
                text: "Envia confirmação imediata e lembrete 24h antes automaticamente pelo WhatsApp.",
              },
              {
                icon: ShieldCheck,
                title: "Handoff humano quando precisa",
                text: "Casos delicados são encaminhados aos seus operadores com contexto completo da conversa.",
              },
              {
                icon: BarChart3,
                title: "Painel em tempo real",
                text: "Veja leads, atendimentos, sugestões e auditoria de tudo o que a IA fez.",
              },
            ].map((f) => (
              <Card key={f.title} className="border-border/60">
                <CardHeader>
                  <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {f.text}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl sm:text-4xl">Escolha seu plano</h2>
            <p className="mt-3 text-muted-foreground">
              Preços em reais, com impostos calculados automaticamente.
            </p>
            <div className="mt-6 inline-flex rounded-full border border-border p-1">
              <button
                onClick={() => setCycle("monthly")}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  cycle === "monthly"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  cycle === "yearly"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                Anual · 2 meses grátis
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {CENTRAL_PLANS.filter((p) => p.cycle === cycle).map((plan) => {
              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col ${
                    plan.highlight
                      ? "border-primary shadow-lg ring-2 ring-primary/40"
                      : "border-border/60"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.highlight && <Badge>Mais escolhido</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-4xl">{plan.priceLabel}</span>
                        <span className="text-sm text-muted-foreground">
                          /{cycle === "monthly" ? "mês" : "ano"}
                        </span>
                      </div>
                      {plan.cycle === "yearly" && (
                         <p className="text-xs text-muted-foreground">≈ R$ {Math.round(parseInt(plan.priceLabel.replace(/\D/g, '')) / 12)}/mês</p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-6">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      Assinar {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Checkout */}
      {selectedPrice && (
        <section id="checkout-section" className="border-t border-border/60 bg-card/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="mb-6 font-display text-2xl">Finalizar assinatura</h2>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Carregando checkout…</div>}>
                  <StripeEmbeddedCheckout priceId={selectedPrice} />
                </Suspense>
              </CardContent>
            </Card>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Em ambiente de teste use o cartão 4242 4242 4242 4242 com qualquer
              CVV e data futura.
            </p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-8 font-display text-3xl">Perguntas frequentes</h2>
          <div className="space-y-6">
            {[
              {
                q: "Preciso de conta no Bemp?",
                a: "Sim — a Julia se conecta ao seu Bemp para consultar agenda e criar agendamentos reais.",
              },
              {
                q: "Como cancelo?",
                a: "A qualquer momento, direto pelo portal do cliente dentro do seu painel. Você mantém acesso até o fim do período pago.",
              },
              {
                q: "Preciso configurar o WhatsApp?",
                a: "Sim. Após assinar, guiamos você para conectar o WhatsApp Cloud API da Meta ao seu número.",
              },
              {
                q: "Como funciona a nota fiscal?",
                a: "O Stripe calcula e coleta os impostos aplicáveis no checkout. A emissão da nota fiscal fica a cargo do prestador.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-border/60 pb-6">
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Seja Livre AI Platform · Julia AI
      </footer>
    </div>
  );
}
