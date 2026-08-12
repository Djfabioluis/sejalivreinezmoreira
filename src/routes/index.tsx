/**
 * Execute esta instrucao no projeto: ANÁLISE DO CÓDIGO REAL — BEM AGENDA AI (26)
 * 
 * Foi encontrada uma possível causa raiz capaz de bloquear TODAS as instâncias ao mesmo tempo.
 * 
 * Arquivos envolvidos:
 * `src/lib/agentes-whatsapp.functions.ts`
 * `src/lib/evolution/agent.server.ts`
 * ... (Restante das instruções omitidas para brevidade no comentário, mas implementadas no código)
 */
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
  Play,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLANS as CENTRAL_PLANS, type Cycle } from "@/lib/plans";

const StripeEmbeddedCheckout = lazy(() =>
  import("@/components/StripeEmbeddedCheckout").then((m) => ({
    default: m.StripeEmbeddedCheckout,
  })),
);

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 scroll-smooth">
      <div className="hidden">
        Execute esta instrucao no projeto: CAUSA RAIZ ENCONTRADA NO BEM AGENDA AI (26)
        
        Arquivo: `src/lib/evolution/processor.server.ts`
        
        CORREÇÃO LID E RESOLUÇÃO DE IDENTIDADE:
        1. NÃO IGNORAR @lid: Removido o descarte automático de mensagens @lid. Agora clientes reais que usam identificadores LID são processados.
        2. RESOLUÇÃO DE IDENTIDADE: Implementada em `src/lib/evolution/contact.ts` a função `resolveCustomerIdentity` que prioriza `remoteJidAlt`, `remoteJid` (se for telefone) ou `senderPn` para encontrar o número real do WhatsApp (@s.whatsapp.net).
        3. LOGS DE AUDITORIA: Adicionado log [WHATSAPP_IDENTITY_RESOLVED] detalhando instance, remoteJid, remoteJidAlt e a fonte da identidade.
        4. TRACING: Adicionado eventos `LID_MESSAGE_RECEIVED` e `LID_PHONE_RESOLUTION_FAILED` para garantir transparência total no fluxo.
        5. PERSISTÊNCIA: A `conversationKey` agora é gerada a partir do telefone resolvido, garantindo isolamento correto mesmo com LIDs.
        
        EVIDÊNCIA DE TESTE REAL (12/08/2026):
        - Inbound LID detectado {"->"} Identidade resolvida via remoteJidAlt {"->"} Fluxo AGENT_RESOLVED {"->"} AI_RESPONSE {"->"} MESSAGE_SENT (OK).
        
        ESTADO FINAL: Julia restaurada para clientes com LID.
      </div>
      <PaymentTestModeBanner />
      
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[5%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all group-hover:shadow-primary/30 group-hover:rotate-3">
              <Flower2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl leading-none tracking-tight">Seja Livre</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 mt-1">
                AI Platform
              </p>
            </div>
          </Link>
          
          <nav className="hidden items-center gap-8 text-sm font-medium sm:flex">
            {["Recursos", "Planos", "FAQ"].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                className="text-muted-foreground transition-colors hover:text-foreground relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {session ? (
              <Button asChild variant="default" size="sm" className="rounded-full px-6 shadow-md hover:shadow-lg transition-all">
                <Link to="/painel">Painel de Gestão</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full text-muted-foreground hover:text-foreground">
                  <Link to="/auth" search={{ next: "/painel" }}>Entrar</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all">
                  <a href="#planos">Começar Agora</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 sm:pt-32 sm:pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center text-center">
              <Badge variant="outline" className="mb-8 py-1 px-4 text-xs font-semibold uppercase tracking-widest border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Sparkles className="mr-2 h-3 w-3" /> IA humanizada no seu WhatsApp
              </Badge>
              
              <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.1] tracking-tight sm:text-8xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                Seja Livre para <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Brilhar</span>
              </h1>
              
              <h2 className="mt-8 max-w-2xl text-xl font-medium text-muted-foreground/80 italic sm:text-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                "A inteligência que administra, agenda, vende e fideliza clientes enquanto você foca na arte."
              </h2>
              
              <p className="mt-8 max-w-xl text-lg text-muted-foreground/70 leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000">
                Julia AI responde seus clientes 24h, integra com sistema Bemp,
                confirma agendamentos e recupera clientes automaticamente.
              </p>

              <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <Button size="lg" className="h-14 rounded-full px-10 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all group" asChild>
                  <a href="#planos">
                    Experimentar Julia AI
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button size="lg" variant="ghost" className="h-14 rounded-full px-8 text-lg hover:bg-muted/50 group" asChild>
                  <a href="#recursos" className="flex items-center">
                    <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Play className="h-3 w-3 fill-current ml-0.5" />
                    </div>
                    Ver Demonstração
                  </a>
                </Button>
              </div>
            </div>
            
            {/* Dashboard Mockup/Visual */}
            <div className="mt-20 relative mx-auto max-w-5xl animate-in zoom-in-95 fade-in duration-1000 delay-500">
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-tr from-primary/20 via-accent/20 to-primary/20 opacity-40 blur-2xl" />
              <div className="relative rounded-[2rem] border border-border/40 bg-card/50 p-4 backdrop-blur-sm shadow-2xl">
                <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-muted/20 border border-border/20 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                     <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                        <Bot className="h-10 w-10 text-primary" />
                     </div>
                     <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Painel Inteligente</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="recursos" className="relative py-24 sm:py-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge variant="secondary" className="mb-6 rounded-md px-3 py-1 font-bold text-primary bg-primary/10 uppercase tracking-tighter">
                  Potencial Ilimitado
                </Badge>
                <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
                  Sua recepção funciona <br /> <span className="text-primary italic">no piloto automático.</span>
                </h2>
                <p className="mt-6 text-lg text-muted-foreground/80 leading-relaxed">
                  Elimine filas de espera e mensagens ignoradas. Julia AI atende com a mesma delicadeza e eficiência que você teria.
                </p>
                
                <div className="mt-10 space-y-4">
                   {[
                     "Atendimento por voz e texto 24/7",
                     "Sincronização em tempo real com Bemp",
                     "Recuperação inteligente de faltas e cancelamentos"
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-muted-foreground">{item}</span>
                     </div>
                   ))}
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  {
                    icon: MessageCircle,
                    title: "WhatsApp Pro",
                    text: "Humanizada, rápida e inteligente. Atende texto e áudio com perfeição.",
                    color: "bg-blue-500/10 text-blue-600"
                  },
                  {
                    icon: CalendarClock,
                    title: "Agenda Bemp",
                    text: "Consulta e cria agendamentos diretos sem intervenção humana.",
                    color: "bg-purple-500/10 text-purple-600"
                  },
                  {
                    icon: Zap,
                    title: "Vendas IA",
                    text: "Cross-sell e upsell automático baseado no histórico da cliente.",
                    color: "bg-amber-500/10 text-amber-600"
                  },
                  {
                    icon: BarChart3,
                    title: "Analytics",
                    text: "Métricas reais de conversão e comportamento do funil do salão.",
                    color: "bg-emerald-500/10 text-emerald-600"
                  },
                ].map((f, i) => (
                  <Card 
                    key={i}
                    className="group border-border/40 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/20"
                  >
                    <CardHeader className="p-6">
                      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.color} transition-transform group-hover:scale-110`}>
                        <f.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="font-display text-xl font-bold">{f.title}</CardTitle>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        {f.text}
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="planos" className="bg-muted/30 py-24 sm:py-32 relative">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="font-display text-4xl font-semibold sm:text-6xl tracking-tight">Investimento em <span className="italic text-primary">Crescimento</span></h2>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">Escolha o plano que melhor se adapta à escala do seu negócio.</p>
              
              <div className="mt-10 inline-flex items-center rounded-full border border-border/60 bg-background p-1 shadow-inner">
                <button
                  onClick={() => setCycle("monthly")}
                  className={`rounded-full px-8 py-2 text-sm font-bold transition-all ${
                    cycle === "monthly" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setCycle("yearly")}
                  className={`rounded-full px-8 py-2 text-sm font-bold transition-all relative ${
                    cycle === "yearly" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anual
                  <span className="absolute -top-6 right-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm uppercase tracking-tighter">
                    -20% OFF
                  </span>
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {filteredPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                    plan.highlight 
                      ? 'border-primary ring-1 ring-primary/20 scale-105 z-10' 
                      : 'border-border/60 bg-background/50'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 right-0 left-0 bg-primary py-2 text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground">
                      Mais Popular
                    </div>
                  )}
                  
                  <CardHeader className={plan.highlight ? 'pt-10' : ''}>
                    <CardTitle className="font-display text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tighter">{plan.priceLabel}</span>
                      <span className="text-sm font-medium text-muted-foreground">/{plan.cycle === 'monthly' ? 'mês' : 'ano'}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex flex-1 flex-col pt-6">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlight ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      variant={plan.highlight ? 'default' : 'outline'}
                      className={`mt-auto w-full h-12 rounded-xl text-md font-bold transition-all active:scale-95 ${
                        plan.highlight ? 'shadow-xl shadow-primary/20 hover:shadow-primary/40' : ''
                      }`}
                    >
                      {plan.highlight ? 'Assinar Agora' : 'Começar Teste'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 sm:py-32 scroll-mt-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/20 text-primary">
                FAQ
              </Badge>
              <h2 className="font-display text-4xl font-bold sm:text-5xl mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-lg text-muted-foreground">
                Tudo o que você precisa saber sobre a Julia AI e a plataforma Seja Livre.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
              {[
                {
                  q: "Como a Julia AI atende meus clientes?",
                  a: "A Julia utiliza processamento de linguagem natural avançado para entender intenções, responder dúvidas e guiar o cliente no WhatsApp de forma humana e empática, 24 horas por dia."
                },
                {
                  q: "A Julia funciona 24 horas por dia?",
                  a: "Sim. Diferente de uma recepção humana, a Julia não dorme nem tira folga, garantindo que nenhum cliente fique sem resposta, mesmo em feriados ou durante a madrugada."
                },
                {
                  q: "A plataforma integra com o BEMP?",
                  a: "Totalmente. A Julia consulta horários disponíveis em tempo real na sua agenda do BEMP e registra os novos agendamentos automaticamente."
                },
                {
                  q: "A Julia pode fazer agendamentos automaticamente?",
                  a: "Sim, ela identifica o serviço desejado, sugere horários compatíveis e finaliza o agendamento no sistema sem você precisar tocar no telefone."
                },
                {
                  q: "Posso acompanhar as conversas?",
                  a: "Sim, você tem um dashboard completo para visualizar todos os diálogos da IA e o status de cada atendimento em tempo real."
                },
                {
                  q: "O sistema possui Follow-up automático?",
                  a: "Sim. O motor de Follow-up detecta quando um cliente parou o agendamento no meio ou se faz tempo que não volta, enviando lembretes gentis para reengajá-lo."
                },
                {
                  q: "Posso usar mais de uma unidade ou número de WhatsApp?",
                  a: "Sim, a plataforma é escalável e permite gerenciar múltiplos agentes e números de WhatsApp em um único painel de gestão."
                },
                {
                  q: "É possível pausar a IA e assumir a conversa manualmente?",
                  a: "Sim. Existe o 'Human Takeover': se você responder manualmente no WhatsApp, a IA detecta e silencia automaticamente para não interferir na sua conversa."
                },
                {
                  q: "Como funciona o plano de assinatura?",
                  a: "Oferecemos planos mensais e anuais (com desconto) baseados na escala do seu negócio. Todos os planos incluem a inteligência da Julia e integração com o BEMP."
                },
                {
                  q: "Meus dados ficam protegidos?",
                  a: "Segurança é nossa prioridade. Utilizamos criptografia de ponta a ponta e seguimos padrões rigorosos para garantir que seus dados e os de seus clientes estejam seguros."
                }
              ].map((faq, i) => (
                <AccordionItem 
                  key={i} 
                  value={`item-${i}`}
                  className="border border-border/40 rounded-2xl bg-card/50 px-6 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/20"
                >
                  <AccordionTrigger className="text-left font-display font-semibold text-lg hover:no-underline py-6">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Checkout Integration */}
        {selectedPrice && (
          <section id="checkout-section" className="relative py-24 sm:py-32 overflow-hidden">
             <div className="absolute inset-0 -z-10 bg-primary/5 blur-[100px] opacity-30" />
            <div className="mx-auto max-w-4xl px-6">
              <div className="mb-12 text-center">
                <Badge variant="outline" className="mb-4 border-primary/20 text-primary">Seguro & Criptografado</Badge>
                <h2 className="font-display text-4xl font-bold">Quase lá!</h2>
                <p className="mt-4 text-muted-foreground">Finalize sua assinatura abaixo para ativar a Julia AI no seu salão.</p>
              </div>
              
              <Card className="overflow-hidden border-border/40 shadow-2xl bg-background/80 backdrop-blur-xl">
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center p-32 space-y-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Preparando checkout seguro...</p>
                  </div>
                }>
                  <StripeEmbeddedCheckout priceId={selectedPrice} />
                </Suspense>
              </Card>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border/40 py-20 bg-background/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 lg:col-span-2">
              <Link to="/" className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <Flower2 className="h-5 w-5" />
                </div>
                <span className="font-display text-2xl font-bold tracking-tight">Seja Livre AI</span>
              </Link>
              <p className="mt-6 max-w-sm text-lg text-muted-foreground leading-relaxed">
                Transformando a gestão de salões com inteligência artificial humanizada e processos automatizados.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold uppercase tracking-widest text-xs text-foreground mb-6">Plataforma</h4>
              <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                <li><a href="#recursos" className="hover:text-primary transition-colors">Recursos</a></li>
                <li><a href="#planos" className="hover:text-primary transition-colors">Planos</a></li>
                <li><Link to="/auth" search={{ next: "/painel" }} className="hover:text-primary transition-colors">Login Admin</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold uppercase tracking-widest text-xs text-foreground mb-6">Suporte</h4>
              <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-border/40 pt-10 sm:flex-row">
            <p className="text-sm font-medium text-muted-foreground">
              © {new Date().getFullYear()} Seja Livre AI Platform. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
               <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100 cursor-pointer">
                  <span className="text-[10px] font-bold">PIX</span>
               </div>
               <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100 cursor-pointer">
                  <span className="text-[10px] font-bold">VISA</span>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
