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

import { PLANS as CENTRAL_PLANS, type Cycle } from "@/lib/plans";

function LandingPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<null | { email?: string }>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  useEffect(() => {
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

  const filteredPlans = CENTRAL_PLANS.filter(p => p.cycle === cycle);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden">Execute esta instrucao no projeto: FASE CRÍTICA 1 — IDENTIFICAÇÃO DE ASSINANTE EXCLUSIVAMENTE POR TELEFONE

PROJETO

Julia — Seja Livre AI Platform

OBJETIVO

Eliminar definitivamente o CPF do fluxo de identificação de Plano Beauty no atendimento WhatsApp.

REGRA DE NEGÓCIO

Quando a cliente mencionar:

- plano;
- Plano Beauty;
- assinatura;
- benefício;
- Plano de Manicure;
- Plano de Escova;
- Plano de Hidratação e Escova;

a identificação deve ocorrer pelo TELEFONE CADASTRADO NA ASSINATURA.

CPF não deve ser solicitado nesse fluxo.

Não alterar outras funcionalidades.
Não publicar automaticamente.

==================================================
1. VARREDURA COMPLETA
==================================================

Pesquisar em todo o projeto:

CPF
cpf
validate_subscription_cpf
getCustomerByCPF
extractCPFFromText
awaitingCpf
cpfRequested
cpfValidationPending
AWAITING_CPF
AWAITING_CPF_FALLBACK
CPF_FALLBACK
REQUEST_CPF
CPF_NOT_PROVIDED
000.000.000-00
"informe seu CPF"
"preciso do seu CPF"
"peça o CPF"

Pesquisar em:

src/
supabase/functions/
supabase/migrations/
prompts
templates
configurações
base_conhecimento
Edge Functions
webhooks
arquivos compilados

Gerar lista de todas as ocorrências.

Classificar:

ACTIVE
LEGACY
TEST
DOCUMENTATION
DATABASE

Nenhuma ocorrência ACTIVE pode permanecer no fluxo de WhatsApp para assinatura.

==================================================
2. ARQUIVOS DUPLICADOS
==================================================

O relatório de auditoria confirma arquivos .js obsoletos coexistindo com .ts.

Realizar primeiro a Fase 1 do audit-remediation:

- localizar pares nome.js + nome.ts;
- migrar imports;
- excluir .js obsoletos;
- garantir que chat.server.js não seja carregado;
- garantir que apenas chat.server.ts seja usado.

Não excluir JS sem equivalente TypeScript ou ainda necessário ao runtime.

==================================================
3. POLÍTICA CENTRAL
==================================================

Criar ou consolidar:

src/lib/subscription-policy.server.ts

Definir:

SUBSCRIPTION_PRIMARY_LOOKUP = "PHONE"
ALLOW_SUBSCRIPTION_CPF_FALLBACK = false

Estados permitidos:

AWAITING_REGISTERED_PHONE
LOOKING_UP_PHONE
AWAITING_REGISTERED_PHONE_RETRY
PLAN_FOUND
HUMAN_HANDOFF

Não usar estado relacionado a CPF.

==================================================
4. PRIMEIRA PERGUNTA DETERMINÍSTICA
==================================================

Ao detectar intenção de plano e não existir telefone validado:

NÃO usar o LLM para decidir qual dado pedir.

Responder diretamente:

"Perfeito! 💜

Para localizar o seu Plano Beauty, qual é o número de telefone cadastrado na assinatura?

Pode enviar com DDD."

Salvar:

subscriptionIntent = true
subscriptionLookupMethod = "PHONE"
subscriptionLookupStage = "AWAITING_REGISTERED_PHONE"
subscriptionPhoneAttempts = 0

==================================================
5. NÃO CONFUNDIR WHATSAPP COM TELEFONE DA ASSINATURA
==================================================

Separar:

whatsappPhone
subscriptionRegisteredPhone

O WhatsApp atual pode ser diferente do número cadastrado no plano.

Quando a cliente informar o telefone do plano, salvar:

subscriptionRegisteredPhoneCountry
subscriptionRegisteredPhoneArea
subscriptionRegisteredPhoneNumber
subscriptionPhoneLast4
subscriptionPhoneValidated

Não sobrescrever whatsappPhone.

==================================================
6. VALIDAÇÃO
==================================================

Durante:

AWAITING_REGISTERED_PHONE
AWAITING_REGISTERED_PHONE_RETRY

uma mensagem como:

41999999999

é TELEFONE.

Não executar parser de CPF.

Executar:

normalizeBrazilianPhone()
validate_subscription_phone

==================================================
7. PRIMEIRA FALHA
==================================================

Se não localizar:

subscriptionPhoneAttempts = 1
subscriptionLookupStage =
"AWAITING_REGISTERED_PHONE_RETRY"

Responder:

"Não encontrei uma assinatura ativa com esse telefone. 💜

Pode conferir e me enviar novamente o número cadastrado no plano, com DDD?"

==================================================
8. SEGUNDA FALHA
==================================================

Não pedir CPF.

Criar handoff:

subscriptionLookupStage = "HUMAN_HANDOFF"
attendance_mode = "HUMAN"
ai_pause_reason =
"SUBSCRIPTION_NOT_FOUND_BY_PHONE"

Mensagem:

"Não consegui localizar sua assinatura pelos telefones informados. 💜

Vou encaminhar seu atendimento para nossa equipe verificar o cadastro e continuar com você por aqui."

==================================================
9. BARREIRA DE TRANSPORTE
==================================================

Nenhum texto automático pedindo CPF pode chegar à Evolution.

Criar:

containsCpfSolicitation(text)

e:

enforceNoCpfInSubscriptionFlow(text, context)

Bloquear solicitações como:

informe seu CPF
preciso do seu CPF
qual é o seu CPF
número do CPF
000.000.000-00
localizar plano + CPF
validar plano + CPF

Aplicar:

chat.server.ts
evolution/reply.server.ts
evolution.server.ts

A última proteção deve ocorrer dentro de sendEvolutionText(), imediatamente antes da Evolution API.

FAIL-CLOSED:

mesmo sem customer_context ou com Supabase indisponível, uma solicitação de CPF deve ser substituída pela pergunta do telefone.

==================================================
10. BEMP
==================================================

Centralizar no BempService conforme a Fase 3 da auditoria.

Fluxo:

telefone cadastrado
→ findCustomerByPhone
→ customerId
→ listCustomerSubscriptions(customerId)
→ plano ativo
→ saldo
→ serviço

Não assumir que subscriptions sempre vêm dentro do objeto customer.

==================================================
11. SERVIÇOS DOS PLANOS
==================================================

Plano de Manicure
→ Manicure Plano Beauty

Plano de Escova
→ Escova Plano Beauty

Plano de Hidratação e Escova
→ Hidratação e Escova

==================================================
12. BASE DE CONHECIMENTO
==================================================

Pesquisar CPF no banco real.

Remover apenas instruções relacionadas a identificação de Plano Beauty por CPF.

Não remover CPF de fluxos administrativos legítimos sem analisar sua finalidade.

Atualizar a regra para:

"Assinantes do Plano Beauty são identificados pelo telefone cadastrado na assinatura."

==================================================
13. TESTES
==================================================

Teste:

"Tenho Plano de Manicure."

Deve pedir telefone.

Primeiro telefone inexistente:
pedir telefone novamente.

Segundo inexistente:
handoff.

Testar também:

context = null
Supabase indisponível
resposta do modelo contendo CPF
follow-up contendo CPF

Em nenhum caso Evolution pode receber solicitação de CPF.

==================================================
14. ENTREGA
==================================================

Informar:

- causa raiz encontrada;
- ocorrências ativas removidas;
- arquivos .js removidos;
- tools registradas;
- consulta BEMP;
- teste Evolution;
- build;
- lint;
- typecheck;
- testes.

Atualizar:

docs/audit-remediation-status.md

com evidências.

Não publicar automaticamente.</div>
      <div className="bg-green-600 text-white p-2 text-center text-xs font-medium">
Execute esta instrucao no projeto: FASE CRÍTICA 3 — CORRIGIR MOTOR DE FOLLOW-UP

OBJETIVO

Fazer o follow-up sair realmente do banco e chegar ao WhatsApp do cliente.

Não criar um segundo motor paralelo.

Localizar e corrigir o motor atual.

==================================================
1. INVENTÁRIO
==================================================

Localizar:

crm_followups
FollowupService
followup-processor
processFollowups
scheduled_at
next_attempt_at
sendFollowup
worker
cron
Edge Function
job

Documentar fluxo atual.

==================================================
2. BANCO REAL
==================================================

Identificar:

PENDING vencidos
READY vencidos
SENDING presos
FAILED
sem scheduled_at
sem conversation_id
sem instance
sem telefone

Mostrar contagens.

==================================================
3. WORKER
==================================================

Confirmar:

- existe;
- está habilitado;
- frequência;
- última execução;
- próximo disparo;
- registros encontrados.

Logs:

FOLLOWUP_WORKER_STARTED
FOLLOWUP_WORKER_FINISHED

==================================================
4. ELEGIBILIDADE
==================================================

Cada registro ignorado precisa informar motivo.

FOLLOWUP_BLOCKED reasonCode:

HUMAN_ATTENDING
CUSTOMER_REPLIED
CONVERSATION_CLOSED
AI_DISABLED
EVOLUTION_OFFLINE
OUTSIDE_ALLOWED_HOURS
INVALID_PHONE
MISSING_INSTANCE
DUPLICATE
LOCKED
NO_MESSAGE
UNKNOWN

Nenhum return silencioso.

==================================================
5. FUSO
==================================================

Persistência:

UTC.

Regras comerciais:

America/Sao_Paulo.

Confirmar que scheduled_at <= now() funciona corretamente.

==================================================
6. TESTE SEM IA
==================================================

Criar um follow-up técnico com mensagem fixa.

Executar manualmente o processor.

Esperado:

worker encontra
→ sendEvolutionText()
→ HTTP sucesso
→ messageId
→ status atualizado

Se isso falhar, não mexer na geração de IA ainda.

==================================================
7. TESTE EVOLUTION
==================================================

Com o mesmo instance/telefone, executar envio direto usando o service central.

A auditoria determina que Evolution deve ser consolidada numa fachada única; não usar chamadas HTTP paralelas. :contentReference[oaicite:2]{index=2}

==================================================
8. GERAÇÃO IA
==================================================

Somente depois do teste fixo passar:

gerar follow-up com IA.

Validar:

text não vazio
prompt
timeout
erro estruturado

==================================================
9. PAUSA HUMANA
==================================================

Quando atendimento humano estiver ativo:

pausar.

Ao retornar para AI:

reavaliar.

Não deixar:

attendance_mode antigo
ai_paused_at antigo
human_only indevido

bloquearem para sempre.

==================================================
10. RETRY
==================================================

Retry para:

429
502
503
504
timeout

Backoff.

Limite de tentativas.

==================================================
11. IDEMPOTÊNCIA
==================================================

Uma tentativa não pode enviar duas mensagens.

Mas uma chave antiga não pode impedir retry legítimo.

==================================================
12. STATUS
==================================================

Padronizar:

PENDING
READY
PROCESSING
SENT
DELIVERED
FAILED
CANCELED

Seguir a futura padronização UPPER_SNAKE_CASE prevista pela auditoria. :contentReference[oaicite:3]{index=3}

==================================================
13. LOGS
==================================================

FOLLOWUP_DETECTED
FOLLOWUP_CREATED
FOLLOWUP_SCHEDULED
FOLLOWUP_ELIGIBLE
FOLLOWUP_BLOCKED
FOLLOWUP_GENERATION_STARTED
FOLLOWUP_GENERATION_COMPLETED
FOLLOWUP_SEND_STARTED
FOLLOWUP_SEND_SUCCESS
FOLLOWUP_SEND_FAILED
FOLLOWUP_RETRY_SCHEDULED
FOLLOWUP_COMPLETED

==================================================
14. TESTE REAL
==================================================

Cliente abandona agendamento.

Comprovar:

registro criado
scheduled_at
worker
mensagem gerada
Evolution
messageId
status final
cliente recebeu

==================================================
15. ENTREGA
==================================================

Informar:

- causa raiz;
- worker ativo;
- query de elegibilidade;
- bloqueios;
- timezone;
- teste fixo;
- teste IA;
- messageId;
- build;
- lint;
- typecheck;
- testes.

Atualizar docs/audit-remediation-status.md.

Não considerar concluído até a mensagem chegar a um WhatsApp de teste.
      </div>
      <PaymentTestModeBanner />

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
                icon: ShieldCheck,
                title: "Controle de Acesso (RBAC)",
                text: "Defina exatamente o que cada operador pode ver ou fazer, com auditoria completa de ações.",
              },
              {
                icon: Bot,
                title: "Julia AI - Persona Especializada",
                text: "Treinada especificamente para o mercado de beleza, com tom de voz acolhedor e focado em conversão.",
              },
              {
                icon: BarChart3,
                title: "CRM Inteligente & Métricas",
                text: "Acompanhe funis, previsões de faturamento e o comportamento das suas clientes em tempo real.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background p-6 transition-all hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-display text-4xl sm:text-5xl">Investimento simples e transparente</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Escolha o plano ideal para o tamanho do seu salão. Todos incluem a Julia AI e a integração com Bemp.
            </p>

            <div className="mt-10 inline-flex items-center rounded-full border border-border/50 bg-muted/50 p-1">
              <button
                onClick={() => setCycle("monthly")}
                className={`rounded-full px-6 py-1.5 text-sm font-medium transition-all ${
                  cycle === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`rounded-full px-6 py-1.5 text-sm font-medium transition-all ${
                  cycle === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Anual <span className="text-[10px] text-green-600 ml-1">(-20%)</span>
              </button>
            </div>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card key={plan.id} className={`relative flex flex-col overflow-hidden border-2 transition-all hover:border-primary/50 ${plan.highlight ? 'border-primary' : 'border-border'}`}>
                {plan.highlight && (
                  <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                    Mais Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.priceLabel}</span>
                    <span className="text-sm text-muted-foreground">/{plan.cycle === 'monthly' ? 'mês' : 'ano'}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    variant={plan.highlight ? 'default' : 'outline'}
                    className="mt-8 w-full"
                    size="lg"
                  >
                    Começar agora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {selectedPrice && (
        <section id="checkout-section" className="border-t border-border bg-muted/30 py-24">
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl">Concluir Assinatura</h2>
              <p className="text-muted-foreground">Pagamento seguro processado pelo Stripe</p>
            </div>
            <Card className="overflow-hidden border-none shadow-2xl">
              <Suspense
                fallback={
                  <div className="flex h-[500px] flex-col items-center justify-center space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Iniciando checkout seguro...</p>
                  </div>
                }
              >
                <StripeEmbeddedCheckout priceId={selectedPrice} />
              </Suspense>
            </Card>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Flower2 className="h-5 w-5 text-primary" />
              <span className="font-display text-lg">Seja Livre AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Seja Livre AI Platform. Todos os direitos reservados.
              {/* Auditoria: {session?.email} */}
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/auth" search={{ next: "/painel" }}>Entrar</Link>
              <a href="#">Privacidade</a>
              <a href="#">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
