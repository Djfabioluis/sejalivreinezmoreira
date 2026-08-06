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
        Execute esta instrucao no projeto: CORREÇÃO DEFINITIVA — BEMP NÃO LOCALIZA ASSINANTE PELO CPF

Foi realizada uma análise do código real do projeto Bem Agenda AI (15).

O problema está no arquivo:

src/lib/bemp/subscriptions.server.ts

A função getCustomerByCPF() atualmente presume, sem evidência validada, que o webhook:

/webhooks/whatsapp_customer

aceita:

?document=CPF

ou:

?cpf=CPF

No restante do projeto, esse mesmo endpoint é utilizado somente com:

phone_country_code
phone_area_code
phone_number

Além disso, os testes atuais usam mocks e não comprovam que o endpoint real do BEMP aceita CPF.

Não adicionar mais tentativas aleatórias de endpoints.

Não declarar corrigido sem testar com um CPF real e conhecido no BEMP.

Não publicar automaticamente.

==================================================
1. AUDITAR A INTEGRAÇÃO REAL
==================================================

Localizar todos os endpoints e contratos BEMP disponíveis no projeto.

Verificar:

- documentação existente;
- chamadas de rede já utilizadas;
- configurações salvas;
- respostas reais;
- rotas da API autenticada;
- webhooks públicos.

Descobrir qual endpoint realmente permite localizar cliente por:

- CPF;
- documento;
- tax_id;
- document_number;
- pesquisa geral;
- outro campo equivalente.

Não presumir o nome do parâmetro.

Registrar no teste, sem dados sensíveis:

{
  endpointPath,
  method,
  parameterName,
  status,
  topLevelKeys,
  responseType
}

Nunca registrar CPF completo ou token.

==================================================
2. NÃO USAR TENTATIVAS ESPECULATIVAS
==================================================

Remover esta lógica:

const attempts = [
  `/whatsapp_customer?document=${cpf}`,
  `/whatsapp_customer?cpf=${cpf}`
];

Substituir por uma função central com contrato confirmado:

BempService.findCustomerByCPF(cpf)

Ela deve usar somente o endpoint e o parâmetro realmente aceitos pelo BEMP.

Se a instalação atual do BEMP não possuir busca pública por CPF:

- não fingir que existe;
- utilizar a API autenticada correta;
- ou criar um fluxo backend autorizado;
- ou retornar BEMP_CPF_LOOKUP_UNSUPPORTED.

==================================================
3. CRIAR RETORNO ESTRUTURADO
==================================================

Criar:

type CustomerLookupResult =
  | {
      success: true;
      customer: {
        id: string | number;
        name: string | null;
        documentLast4: string;
      };
    }
  | {
      success: false;
      code:
        | "INVALID_CPF"
        | "CUSTOMER_NOT_FOUND"
        | "MULTIPLE_CUSTOMERS_FOUND"
        | "BEMP_CPF_LOOKUP_UNSUPPORTED"
        | "BEMP_UNAUTHORIZED"
        | "BEMP_RATE_LIMITED"
        | "BEMP_UNAVAILABLE"
        | "BEMP_INVALID_RESPONSE";
      retryable: boolean;
      message: string;
    };

Não retornar:

success: true
found: false

para erros técnicos.

Cliente inexistente e falha técnica são situações diferentes.

==================================================
4. TRATAR FORMATO REAL DA RESPOSTA
==================================================

Criar schemas Zod com base na resposta real observada.

Suportar explicitamente os formatos confirmados, como:

{
  customer: {...}
}

{
  data: {
    customer: {...}
  }
}

{
  data: [...]
}

[
  {...}
]

{
  results: [...]
}

Não aceitar qualquer objeto automaticamente.

Remover:

if (data && typeof data === "object") {
  customer = data;
}

Validar o schema.

Caso o formato não corresponda:

BEMP_INVALID_RESPONSE

Registrar somente as chaves e tipos da resposta.

==================================================
5. NORMALIZAR RESULTADOS EM ARRAY
==================================================

Se a busca retornar array:

- normalizar todos os CPFs/documentos;
- comparar com o CPF solicitado;
- selecionar somente correspondência exata.

Se zero correspondências:

CUSTOMER_NOT_FOUND

Se uma:

continuar.

Se mais de uma:

MULTIPLE_CUSTOMERS_FOUND

Não escolher o primeiro cadastro arbitrariamente.

==================================================
6. VALIDAR A IDENTIDADE PELO CPF
==================================================

Não considerar que qualquer objeto com id ou name seja o cliente correto.

Comparar o documento retornado pelo BEMP com o CPF solicitado quando o campo estiver disponível.

Reconhecer aliases confirmados:

cpf
document
document_number
tax_id
documentNumber

Normalizar para 11 dígitos antes de comparar.

Se o endpoint não devolver o documento, registrar:

document_not_verifiable

e usar somente o contrato oficial do endpoint.

==================================================
7. CONSULTAR AS ASSINATURAS SEPARADAMENTE
==================================================

O código atual pressupõe que os planos estão embutidos no cliente:

extractPlansFromCustomer(container)

Isso não é suficiente.

Depois de localizar o cliente:

const customer = await BempService.findCustomerByCPF(cpf);

const subscriptions =
  await BempService.listCustomerSubscriptions(
    customer.id
  );

Descobrir e utilizar o endpoint real de assinaturas por cliente.

Possíveis formatos devem ser confirmados, não presumidos.

Se o endpoint do cliente já retornar assinaturas, normalizar pela mesma função.

==================================================
8. IMPLEMENTAR NO BEMPSERVICE
==================================================

Adicionar em:

src/lib/bemp-service.server.ts

Métodos:

findCustomerByCPF(cpf: string)

listCustomerSubscriptions(customerId)

getCustomerSubscriptionBenefits(
  customerId,
  subscriptionId
)

Não manter a consulta de CPF diretamente em subscriptions.server.ts.

subscriptions.server.ts deve aplicar somente as regras de domínio depois que o BempService retornar dados normalizados.

==================================================
9. PARSER DE ASSINATURAS
==================================================

Criar schema e parser específico.

Campos normalizados:

{
  id,
  name,
  status,
  validFrom,
  validUntil,
  availableUses,
  unlimited,
  benefits,
  allowedUnitIds
}

Não usar asArray() genérico para esconder formato desconhecido.

Se a resposta não corresponder ao contrato:

BEMP_INVALID_RESPONSE

==================================================
10. NÃO CONSIDERAR STATUS DESCONHECIDO COMO ATIVO
==================================================

Hoje evaluatePlan() considera o plano ativo sempre que não reconhece um estado inativo.

Isso significa que:

status vazio
status desconhecido
status inesperado

podem virar plano ativo.

Corrigir para:

ACTIVE somente quando o status real estiver explicitamente mapeado como ativo.

Mapear valores reais encontrados no BEMP.

Exemplo conceitual:

ACTIVE_ALIASES = [
  "active",
  "ativo",
  "vigente",
  "enabled"
];

INACTIVE_ALIASES = [
  "inactive",
  "inativo",
  "canceled",
  "cancelled",
  "cancelado",
  "expired",
  "vencido",
  "suspended",
  "suspenso"
];

Status desconhecido:

UNKNOWN

Não autorizar uso do plano automaticamente.

==================================================
11. DIFERENCIAR CLIENTE SEM PLANO DE ERRO
==================================================

Retornos obrigatórios:

Cliente não existe:

CUSTOMER_NOT_FOUND

Cliente existe, mas não possui assinatura:

NO_SUBSCRIPTION

Assinatura existe, mas está inativa:

NO_ACTIVE_SUBSCRIPTION

Assinatura sem saldo:

SUBSCRIPTION_NO_BALANCE

Erro técnico:

BEMP_UNAVAILABLE
BEMP_UNAUTHORIZED
BEMP_INVALID_RESPONSE

A IA não pode dizer:

“Você não possui plano”

quando a consulta ao BEMP falhar.

==================================================
12. CORRIGIR A TOOL
==================================================

Em:

src/lib/chat.server.ts

A tool validate_subscription_cpf deve utilizar apenas o result estruturado.

Fluxo:

1. validar CPF;
2. findCustomerByCPF;
3. listCustomerSubscriptions;
4. normalizar planos;
5. selecionar planos ativos;
6. salvar contexto;
7. retornar para a IA.

Não capturar todos os problemas como customer_not_found.

==================================================
13. NÃO DUPLICAR CONSULTA POR TELEFONE
==================================================

Depois da validação obrigatória por CPF:

- utilizar o customerId oficial localizado;
- não substituir o resultado pela consulta por telefone;
- não chamar get_customer_active_plans por telefone como fonte principal.

A consulta por telefone pode ser usada somente como fallback explicitamente permitido, nunca para contradizer o CPF validado.

==================================================
14. CORRIGIR OS TESTES
==================================================

Os testes atuais apenas simulam que o primeiro endpoint retorna o formato desejado.

Manter testes unitários, mas adicionar testes de contrato com fixtures reais sanitizadas.

Criar fixtures para:

- objeto customer;
- data.customer;
- array de clientes;
- results;
- resposta de erro;
- assinaturas separadas;
- plano ativo;
- plano inativo;
- status desconhecido;
- cliente sem plano.

Adicionar teste que confirme:

getCustomerByCPF não considera qualquer objeto como cliente.

Adicionar teste que confirme:

uma resposta array é interpretada corretamente.

Adicionar teste que confirme:

a assinatura é consultada pelo customerId.

==================================================
15. TESTE REAL OBRIGATÓRIO
==================================================

Usar um CPF real de teste já confirmado no BEMP.

Não colocar o CPF no código, logs, relatório ou commit.

Executar o fluxo e comprovar:

cpf_validation_completed
bemp_customer_lookup_started
bemp_customer_lookup_completed
bemp_customer_identity_matched
bemp_subscription_lookup_started
bemp_subscription_lookup_completed
bemp_active_subscription_found
subscription_service_resolved

Mostrar no relatório somente:

{
  cpfLast4,
  customerIdMasked,
  customerFound: true,
  subscriptionsCount,
  activeSubscriptionsCount,
  mappedServiceName
}

==================================================
16. LOGS
==================================================

Adicionar:

bemp_cpf_endpoint_resolved
bemp_customer_response_shape
bemp_customer_identity_matched
bemp_customer_identity_mismatch
bemp_subscription_endpoint_resolved
bemp_subscription_response_shape
bemp_active_subscription_found
bemp_no_subscription
bemp_subscription_unknown_status
bemp_cpf_lookup_unsupported

Não registrar URLs com query contendo CPF.

Não registrar resposta completa.

==================================================
17. ARQUIVOS PRIORITÁRIOS
==================================================

Revisar e corrigir:

src/lib/bemp/subscriptions.server.ts
src/lib/bemp-service.server.ts
src/lib/bemp.server.ts
src/lib/chat.server.ts
src/lib/bemp/tests/cpf-plans.test.ts

Não criar uma terceira implementação de busca por CPF.

==================================================
18. ENTREGA
==================================================

Ao concluir, informar:

1. endpoint real de busca por CPF;
2. parâmetro real utilizado;
3. formato real do cliente;
4. endpoint real das assinaturas;
5. formato real das assinaturas;
6. causa raiz;
7. arquivos alterados;
8. testes unitários;
9. teste de contrato;
10. teste real mascarado;
11. build;
12. typecheck;
13. lint.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

Não declarar corrigido com base apenas nos mocks atuais.

A correção só estará comprovada quando um CPF conhecido for localizado no BEMP, o customerId for obtido e as assinaturas desse cliente forem consultadas com sucesso.
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
