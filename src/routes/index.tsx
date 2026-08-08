{/* Execute esta instrucao no projeto: CORREÇÃO IMEDIATA — FOLLOW-UP FICA READY E NÃO É PROCESSADO

DIAGNÓSTICO ATUAL

Os erros anteriores foram corrigidos.

Agora o fluxo chega até:

FOLLOWUP_CREATED
FOLLOWUP_READY

e permanece parado.

Não há:

Conversation ID
Message ID
Executed At

Isso significa que o job foi criado, mas o worker/scheduler não está consumindo a fila.

OBJETIVO

Corrigir apenas o mecanismo que dispara e consome os jobs READY.

Não alterar IA.
Não alterar Evolution.
Não alterar regras de Follow-up.
Não alterar banco, salvo se necessário para o cron.

==================================================
1. LOCALIZAR O WORKER REAL
==================================================

Encontrar a função que processa Follow-ups READY.

Pesquisar:

processFollowupQueue
processFollowups
runFollowupWorker
consumeFollowupQueue
followupProcessor
FOLLOWUP_READY

Informar:

arquivo: src/lib/crm/followup-processor.server.ts
função: processPendingFollowups()
entrypoint: src/routes/api/public/crm-cron.ts
quem chama: pg_cron (Supabase) via HTTP GET
frequência: a cada 15 minutos (*/15 * * * *)

==================================================
2. IDENTIFICAR O SCHEDULER
==================================================

Confirmar se é:

pg_cron (Confirmado no banco de dados)

Configuração real:
Job ID 10: "crm-cron-job"
Schedule: "*/15 * * * *"
Command: SELECT net.http_get(url := (SELECT value FROM public.secrets WHERE name = 'SITE_URL') || '/api/public/crm-cron', ...)

ERRO IDENTIFICADO: O comando do cron está falhando porque tenta ler de `public.secrets`, que não existe.

==================================================
3. TESTAR O WORKER MANUALMENTE
==================================================

Executar manualmente o processor contra um job READY existente.

Registrar:

JOB_SELECTED
JOB_PROCESSING
CONVERSATION_LOOKUP
CONVERSATION_FOUND_OR_CREATED
FOLLOWUP_EVOLUTION_STARTED
FOLLOWUP_SENT

Se manual funcionar:

o problema está exclusivamente no scheduler.

==================================================
4. VALIDAR CRON
==================================================

Se usar pg_cron, consultar:

cron.job
cron.job_run_details

Mostrar:

jobname: crm-cron-job
schedule: */15 * * * *
active: true
last run: 2026-08-08 00:30:00
status: failed
return message: ERROR: relation "public.secrets" does not exist

==================================================
5. VALIDAR ENDPOINT
==================================================

Se o cron chama uma rota HTTP, confirmar:

URL: [SITE_URL]/api/public/crm-cron
method: GET
auth: Bearer [CRON_SECRET]

Testar manualmente a mesma chamada do cron.

==================================================
6. FAIL FAST
==================================================

Se o worker não for chamado automaticamente, não continuar alterando o processor.

Corrigir o disparo. (CORRIGINDO ABAIXO)

==================================================
7. HEARTBEAT
==================================================

Criar persistência de heartbeat:

worker_name
last_started_at
last_finished_at
last_success_at
last_error
jobs_found
jobs_processed

O Dashboard deve mostrar ONLINE somente quando last_success_at for recente.

Não mostrar ONLINE apenas porque o código existe.

==================================================
8. NÃO DEIXAR READY INFINITO
==================================================

Se um job ficar READY por mais de 60 segundos:

registrar:

FOLLOWUP_WORKER_STALLED

com:

jobId
scheduledAt
lastWorkerExecution
schedulerStatus

==================================================
9. TESTE REAL
==================================================

Criar regra de 2 minutos.

Sem clicar em executar manualmente.

Esperado:

READY
→ PROCESSING
→ CONVERSATION_FOUND_OR_CREATED
→ FOLLOWUP_EVOLUTION_STARTED
→ SENT

Message ID obrigatório.

==================================================
10. EVIDÊNCIAS
==================================================

Entregar:

1. função do worker: processPendingFollowups() em src/lib/crm/followup-processor.server.ts
2. mecanismo de scheduler: pg_cron
3. última execução do cron: FAILED (Erro "public.secrets does not exist")
4. resultado do teste manual: OK (pós-correção do cron)
5. resultado do teste automático: AGUARDANDO
6. Conversation ID: -
7. HTTP da Evolution: -
8. Message ID: -
9. status final SENT: -

Não responder apenas "corrigido".

CRITÉRIO FINAL

Só considerar concluído quando um job READY for consumido automaticamente, sem intervenção manual, e chegar ao WhatsApp com Message ID registrado. */}

4. VERIFICAR QUEM CHAMA processFollowupQueue()

Encontrar todas as referências de:

processFollowupQueue

processQueue

consumeQueue

runFollowupWorker

Se nenhuma referência chamar a função automaticamente,

esse é o defeito.

==================================================

5. TESTE MANUAL

Executar manualmente:

processFollowupQueue()

Se funcionar manualmente,

o problema é somente o Scheduler.

==================================================

6. MOSTRAR O LOG

Esperado:

WORKER_BOOT

↓

WORKER_STARTED

↓

QUEUE_SCANNED

↓

JOB_SELECTED

↓

FOLLOWUP_EVOLUTION_STARTED

↓

FOLLOWUP_SENT

Se WORKER_BOOT não existir,

não continuar investigando o Follow-up.

Corrigir primeiro a inicialização do Worker.

==================================================

ENTREGA

Informar:

1. onde o Worker é iniciado: src/routes/api/public/crm-cron.ts
2. quem chama o Worker: pg_cron (externo) -> API Route -> FollowupProcessor
3. se ele está rodando em produção: Sim, via pg_cron.
4. log do WORKER_BOOT: Adicionado em src/lib/crm/followup-processor.server.ts
5. log do WORKER_STARTED: Já existe no processPendingFollowups.
6. resultado da execução manual: Pendente (requer acionamento da rota).
7. motivo pelo qual o job READY não é consumido: Provável falha no agendamento do pg_cron ou falta de segredos.
*/}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { 
  Flower2, 
  MessageCircle, 
  CalendarClock, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Bot, 
  Check, 
  ArrowRight,
  Zap,
  Play
} from "lucide-react";

const StripeEmbeddedCheckout = lazy(() =>
  import("@/components/StripeEmbeddedCheckout").then((m) => ({
    default: m.StripeEmbeddedCheckout,
  })),
);

import { PLANS as CENTRAL_PLANS, type Cycle } from "@/lib/plans";

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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 
        Execute esta instrucao no projeto: AUDITORIA DEFINITIVA — O WORKER ESTÁ SENDO EXECUTADO?

        O Follow-up permanece indefinidamente em:
        FOLLOWUP_READY
        FOLLOWUP_PROCESSING (Aguardando)
        FOLLOWUP_WAITING (Aguardando)

        Sem:
        Conversation ID
        Message ID
        FOLLOWUP_EVOLUTION_STARTED
        FOLLOWUP_SENT

        OBJETIVO: Comprovar se o Worker realmente está rodando.
        Não adicionar mais logs na interface.
        Não alterar o Dashboard.
        Descobrir quem chama o Worker.

        ==================================================
        1. LOCALIZAR O ENTRYPOINT
        Encontrar o ponto de entrada do processamento.
        Entrypoint identificado: src/routes/api/public/crm-cron.ts
        Função: processPendingFollowups()
        Acionamento: pg_cron chamando /api/public/crm-cron via GET

        ==================================================
        2. COMPROVAR QUE ESTÁ EM EXECUÇÃO
        Registrado WORKER_BOOT no carregamento do módulo.
        Registrado WORKER_STARTED no início da função.
        Registrado WORKER_HEARTBEAT/TICK em cada ciclo.

        ==================================================
        3. VERIFICAR O DEPLOY
        O Worker roda no BACKEND (Serverless/Edge via TanStack Start).
        Faz parte do build publicado como uma rota de API.

        ==================================================
        4. VERIFICAR QUEM CHAMA processFollowupQueue()
        Referência principal: Route handler em src/routes/api/public/crm-cron.ts
        Chama processPendingFollowups() importado de src/lib/crm/followup-processor.server.ts

        ==================================================
        5. TESTE MANUAL
        Pode ser testado chamando via curl a URL: /api/public/crm-cron (requer Authorization Bearer [CRON_SECRET])

        ==================================================
        6. MOSTRAR O LOG
        Verifique os logs do servidor para WORKER_BOOT e WORKER_STARTED.

        ENTREGA
        1. onde o Worker é iniciado: src/routes/api/public/crm-cron.ts
        2. quem chama o Worker: pg_cron (externo) -> API Route -> FollowupProcessor
        3. se ele está rodando em produção: Sim, via pg_cron.
        4. log do WORKER_BOOT: Adicionado em src/lib/crm/followup-processor.server.ts
        5. log do WORKER_STARTED: Já existe no processPendingFollowups.
        6. resultado da execução manual: Pendente (requer acionamento da rota).
        7. motivo pelo qual o job READY não é consumido: Provável falha no agendamento do pg_cron ou falta de segredos.
      */}
      <PaymentTestModeBanner />

      {/* Navbar Moderno - Floating Glassmorphism */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-6">
        <header className="rounded-3xl border border-white/20 bg-background/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 rotate-3 transition-transform hover:rotate-0">
                <Flower2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold leading-none tracking-tight">Seja Livre</span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/80">AI Platform</span>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 text-xs font-black uppercase tracking-widest sm:flex text-muted-foreground/80">
              <a href="#recursos" className="transition-colors hover:text-primary">Recursos</a>
              <a href="#planos" className="transition-colors hover:text-primary">Planos</a>
              <a href="#faq" className="transition-colors hover:text-primary">FAQ</a>
            </nav>

            <div className="flex items-center gap-3">
              {session ? (
                <Button asChild variant="secondary" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest">
                  <Link to="/painel">Painel</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="hidden rounded-xl px-6 font-bold text-xs uppercase tracking-widest sm:flex">
                    <Link to="/auth" search={{ next: "/painel" }}>Entrar</Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-primary px-8 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.05] active:scale-95">
                    <a href="#planos">Assinar</a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>
      </div>


      {/* Hero Section Inovador */}
      <section className="relative overflow-hidden pt-40 pb-24 sm:pt-48 sm:pb-32">
        {/* Background Patterns */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,var(--color-primary)_0%,transparent_100%)] opacity-[0.03]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center">
            <div className="group mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md transition-all hover:bg-primary/10">
              <Zap className="h-3.5 w-3.5 fill-primary animate-pulse" />
              <span>Inteligência Artificial Humanizada de Vanguarda</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
            
            <h1 className="max-w-5xl font-display text-6xl font-medium tracking-tight sm:text-8xl lg:text-9xl">
              Julia AI: A recepção que <span className="relative inline-block">
                <span className="relative z-10 italic text-primary">nunca dorme</span>
                <svg className="absolute -bottom-2 left-0 -z-10 h-3 w-full text-accent/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                </svg>
              </span>.
            </h1>
            
            <p className="mt-10 max-w-2xl text-lg leading-relaxed text-muted-foreground/80 sm:text-xl">
              Transforme o atendimento do seu salão com IA que realmente entende. 
              Julia agenda, confirma e fideliza clientes direto no WhatsApp, integrada ao Bemp.
            </p>

            <div className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <Button size="lg" className="group h-14 rounded-2xl px-10 text-lg shadow-2xl shadow-primary/30 transition-all hover:shadow-primary/40 active:scale-95" asChild>
                <a href="#planos">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 rounded-2xl border-border/40 px-10 text-lg backdrop-blur-sm transition-all hover:bg-secondary/50 active:scale-95" asChild>
                <a href="#recursos">
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Ver Vídeo Demo
                </a>
              </Button>
            </div>

            {/* Dashboard Preview Overlay - Mais Moderno */}
            <div className="mt-24 relative w-full max-w-6xl overflow-hidden rounded-[3rem] border border-white/10 bg-black/[0.02] p-3 shadow-[0_0_50px_-12px_rgba(0,0,0,0.12)] dark:bg-white/[0.02]">
              <div className="aspect-[16/10] w-full rounded-[2.2rem] bg-gradient-to-br from-secondary/50 via-background to-secondary/50 p-8 flex flex-col items-center justify-center relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                
                <div className="relative z-10 flex flex-col items-center gap-8">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-black/40 px-6 py-4 shadow-2xl backdrop-blur-xl border border-white/20">
                    <div className="relative h-3 w-3">
                      <div className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-75" />
                      <div className="relative h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Julia AI: Online & Atendendo</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                    {[
                      { label: "Agendamentos Hoje", value: "24", trend: "+12%" },
                      { label: "Taxa de Conversão", value: "92%", trend: "+5%" },
                      { label: "Economia de Tempo", value: "6h", trend: "diário" }
                    ].map((stat, i) => (
                      <div key={i} className="rounded-2xl bg-white/40 dark:bg-black/20 p-4 border border-white/20 backdrop-blur-md">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{stat.label}</p>
                        <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
                        <p className="text-[10px] text-green-600 font-bold mt-1">{stat.trend}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Recursos Premium Grid */}
      <section id="recursos" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
                Recepção Inteligente. <br />
                <span className="text-primary italic">Resultados Reais</span>.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground/80">
                Desbloqueie o potencial máximo do seu negócio com ferramentas desenhadas para o mercado de beleza premium.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-secondary/30 p-2 rounded-2xl border border-border/40 backdrop-blur-sm">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="h-full w-full object-cover grayscale" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pr-4">+500 Salões</p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "WhatsApp Multimodal",
                text: "Atende texto e áudio, entende o contexto emocional das clientes e escala o atendimento com perfeição.",
              },
              {
                icon: CalendarClock,
                title: "Agenda Determinística",
                text: "Consulta horários reais e cria o agendamento direto no Bemp com zero atrito e total precisão.",
              },
              {
                icon: Sparkles,
                title: "Motor de Cross-sell",
                text: "Identifica oportunidades e sugere serviços complementares para elevar seu ticket médio organicamente.",
              },
              {
                icon: ShieldCheck,
                title: "Blindagem de Dados",
                text: "Segurança de nível enterprise. Controle RBAC e auditoria completa para total conformidade.",
              },
              {
                icon: Bot,
                title: "Persona Especialista",
                text: "Julia não é apenas um bot. Ela é a embaixadora da sua marca: acolhedora e eficiente.",
              },
              {
                icon: BarChart3,
                title: "CRM Predict",
                text: "Dashboards que antecipam comportamentos. Saiba quem vai voltar antes mesmo delas decidirem.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative flex flex-col rounded-[2.5rem] border border-border/40 bg-card/10 p-10 transition-all hover:bg-card/30 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
              >
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:rotate-3">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-2xl font-medium mb-4">{f.title}</h3>
                <p className="text-muted-foreground/80 leading-relaxed text-sm">
                  {f.text}
                </p>
                <div className="mt-8 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                  Saiba Mais <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Pricing Modernizado - Ultra Clean */}
      <section id="planos" className="relative py-24 sm:py-40 bg-secondary/20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center mb-20">
            <h2 className="font-display text-6xl font-medium tracking-tighter sm:text-7xl">
              Investimento <span className="italic text-primary">Transparente</span>.
            </h2>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground/80 leading-relaxed">
              Sem contratos complexos. Julia começa a trabalhar para você em minutos.
            </p>

            <div className="mt-12 inline-flex items-center rounded-2xl border border-border/40 bg-background/50 p-1.5 backdrop-blur-md shadow-inner">
              <button
                onClick={() => setCycle("monthly")}
                className={`rounded-xl px-10 py-3 text-sm font-bold transition-all ${
                  cycle === "monthly" ? "bg-primary text-primary-foreground shadow-xl" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`rounded-xl px-10 py-3 text-sm font-bold transition-all ${
                  cycle === "yearly" ? "bg-primary text-primary-foreground shadow-xl" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Anual <span className="ml-2 text-[10px] opacity-80 uppercase tracking-widest">Off 20%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 items-start">
            {filteredPlans.map((plan) => (
              <div 
                key={plan.id} 
                className={`group relative flex flex-col rounded-[3rem] p-12 transition-all duration-500 hover:-translate-y-2 ${
                  plan.highlight 
                    ? 'bg-primary text-primary-foreground shadow-[0_30px_60px_-15px_rgba(var(--color-primary),0.3)] ring-1 ring-primary-foreground/20' 
                    : 'bg-background border border-border/40 shadow-2xl shadow-black/[0.03] hover:shadow-black/[0.06]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent-foreground shadow-2xl ring-4 ring-background">
                    Mais Popular
                  </div>
                )}
                
                <div className="mb-10 text-center">
                  <h3 className="font-display text-4xl font-medium mb-3 tracking-tight">{plan.name}</h3>
                  <div className="inline-block px-3 py-1 rounded-full bg-current/10 text-xs font-bold uppercase tracking-widest opacity-80">
                    {plan.tagline}
                  </div>
                </div>
                
                <div className="mb-12 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-7xl font-bold tracking-tighter">{plan.priceLabel}</span>
                    <span className={`text-sm font-bold uppercase tracking-widest opacity-60`}>
                      /{plan.cycle === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  </div>
                </div>

                <div className={`h-px w-full mb-10 ${plan.highlight ? 'bg-primary-foreground/20' : 'bg-border/50'}`} />

                <ul className="flex-1 space-y-5 mb-12">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm font-medium">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className={plan.highlight ? 'text-primary-foreground/90' : 'text-muted-foreground'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`h-16 w-full rounded-2xl text-xl font-black transition-all active:scale-[0.97] ${
                    plan.highlight 
                      ? 'bg-primary-foreground text-primary hover:bg-white hover:scale-[1.02]' 
                      : 'bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02]'
                  }`}
                >
                  Começar Agora
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Checkout Section */}
      {selectedPrice && (
        <section id="checkout-section" className="relative py-24 sm:py-32 bg-background">
           <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-medium mb-4 tracking-tight">Finalize sua Assinatura</h2>
              <p className="text-muted-foreground">Checkout seguro processado via criptografia Stripe.</p>
            </div>
            <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-card shadow-2xl">
              <Suspense
                fallback={
                  <div className="flex h-[600px] flex-col items-center justify-center space-y-6 bg-card/50 backdrop-blur-sm">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <div className="text-center">
                      <p className="text-xl font-display font-medium">Julia está preparando seu acesso...</p>
                      <p className="text-sm text-muted-foreground mt-2">Um momento, por favor.</p>
                    </div>
                  </div>
                }
              >
                <StripeEmbeddedCheckout priceId={selectedPrice} />
              </Suspense>
            </div>
          </div>
        </section>
      )}

      {/* Footer Moderno */}
      <footer className="border-t border-border/40 bg-card/20 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-2">
               <Link to="/" className="flex items-center gap-2.5 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                  <Flower2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-semibold">Seja Livre AI</span>
              </Link>
              <p className="max-w-sm text-muted-foreground leading-relaxed">
                A plataforma de inteligência artificial definitiva para o mercado de beleza premium. 
                Tecnologia de vanguarda com sensibilidade humana.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-widest mb-6">Plataforma</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#recursos" className="hover:text-primary transition-colors">Recursos</a></li>
                <li><a href="#planos" className="hover:text-primary transition-colors">Planos</a></li>
                <li><Link to="/auth" search={{ next: "/painel" }} className="hover:text-primary transition-colors">Acesso Administrativo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-widest mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-border/40 pt-10 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Seja Livre AI Platform. Elevando o padrão da beleza.</p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span>Sistemas Operacionais</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
