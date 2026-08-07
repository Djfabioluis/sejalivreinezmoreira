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
      <PaymentTestModeBanner />

      {/* Navbar Moderno */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Flower2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-semibold leading-none tracking-tight">Seja Livre</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">AI Platform</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium sm:flex">
            <a href="#recursos" className="text-muted-foreground transition-colors hover:text-primary">Recursos</a>
            <a href="#planos" className="text-muted-foreground transition-colors hover:text-primary">Planos</a>
            <a href="#faq" className="text-muted-foreground transition-colors hover:text-primary">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <Button asChild variant="secondary" className="rounded-full px-6">
                <Link to="/painel">Painel de Controle</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden rounded-full px-6 sm:flex">
                  <Link to="/auth" search={{ next: "/painel" }}>Entrar</Link>
                </Button>
                <Button asChild className="rounded-full bg-primary px-8 shadow-xl shadow-primary/20 transition-transform active:scale-95">
                  <a href="#planos">Assinar Agora</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section Inovador */}
      <section className="relative overflow-hidden pt-40 pb-24 sm:pt-48 sm:pb-32">
        {/* Background Gradients */}
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-full -translate-x-1/2 blur-[120px] opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center">
            <Badge variant="secondary" className="mb-8 h-8 rounded-full border border-primary/20 bg-primary/5 px-4 text-sm font-medium text-primary shadow-sm">
              <Zap className="mr-2 h-3.5 w-3.5 fill-primary" />
              IA Humanizada • 24h no WhatsApp
            </Badge>
            
            <h1 className="max-w-4xl font-display text-5xl font-medium tracking-tight sm:text-7xl lg:text-8xl">
              Julia AI: A recepção que <span className="italic text-primary">nunca dorme</span>.
            </h1>
            
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Transforme o atendimento do seu salão com inteligência artificial humanizada. 
              Julia agenda, confirma e fideliza clientes direto no WhatsApp, integrada ao Bemp.
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <Button size="lg" className="h-14 rounded-full px-10 text-lg shadow-2xl shadow-primary/30" asChild>
                <a href="#planos">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 rounded-full border-border/40 px-10 text-lg backdrop-blur-sm" asChild>
                <a href="#recursos">
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Ver Vídeo Demo
                </a>
              </Button>
            </div>

            {/* Dashboard Preview Overlay */}
            <div className="mt-20 relative w-full max-w-6xl rounded-[2.5rem] border border-border/40 bg-card/30 p-2 backdrop-blur-sm shadow-2xl">
              <div className="aspect-[16/9] w-full rounded-[2rem] bg-gradient-to-br from-muted to-background flex items-center justify-center overflow-hidden">
                <div className="text-muted-foreground/20 text-9xl font-display font-black opacity-5 uppercase tracking-tighter select-none">
                  SEJA LIVRE AI
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="flex items-center gap-3 rounded-full bg-background/80 px-6 py-3 shadow-xl backdrop-blur-md">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Julia AI está online no WhatsApp</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Premium Grid */}
      <section id="recursos" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 max-w-2xl">
            <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Tudo o que sua recepção precisa, <span className="text-primary italic">automatizado</span>.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Desbloqueie o potencial máximo do seu negócio com ferramentas desenhadas para o mercado de beleza.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "WhatsApp Multimodal",
                text: "Atende texto e áudio, entende contexto e escala o atendimento com perfeição.",
              },
              {
                icon: CalendarClock,
                title: "Agenda Inteligente",
                text: "Consulta horários e cria o agendamento direto no sistema Bemp sem erros.",
              },
              {
                icon: Sparkles,
                title: "Motor de Cross-sell",
                text: "Sugere serviços complementares no final do atendimento para elevar seu ticket médio.",
              },
              {
                icon: ShieldCheck,
                title: "Segurança Bancária",
                text: "Controle RBAC e auditoria completa. Seus dados e da sua cliente estão sempre protegidos.",
              },
              {
                icon: Bot,
                title: "Persona Julia AI",
                text: "Treinada para ser a embaixadora da sua marca: acolhedora, eficiente e vendedora.",
              },
              {
                icon: BarChart3,
                title: "CRM Estratégico",
                text: "Indicadores em tempo real para você decidir baseada em dados, não em intuição.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/20 p-8 transition-all hover:bg-card/40 hover:shadow-2xl hover:shadow-primary/5"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-2xl font-medium mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Modernizado */}
      <section id="planos" className="relative py-24 sm:py-32 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-display text-5xl font-medium tracking-tight sm:text-6xl italic">Preços Simples.</h2>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Sem taxas escondidas. Cancele quando quiser.
            </p>

            <div className="mt-12 inline-flex items-center rounded-2xl border border-border/40 bg-background/50 p-1.5 backdrop-blur-sm shadow-sm">
              <button
                onClick={() => setCycle("monthly")}
                className={`rounded-xl px-8 py-2.5 text-sm font-semibold transition-all ${
                  cycle === "monthly" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`rounded-xl px-8 py-2.5 text-sm font-semibold transition-all ${
                  cycle === "yearly" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Anual <span className="ml-2 text-[10px] opacity-80">ECONOMIZE 20%</span>
              </button>
            </div>
          </div>

          <div className="mt-20 grid gap-8 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <div 
                key={plan.id} 
                className={`relative flex flex-col rounded-[2.5rem] p-10 transition-all hover:scale-[1.02] ${
                  plan.highlight 
                    ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/20 ring-4 ring-primary/10' 
                    : 'bg-background border border-border/40 shadow-xl shadow-black/[0.02]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-[10px] font-black uppercase tracking-widest text-accent-foreground shadow-xl">
                    Recomendado
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="font-display text-3xl font-medium mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{plan.tagline}</p>
                </div>
                
                <div className="mb-10 flex items-baseline gap-1">
                  <span className="text-6xl font-bold tracking-tighter">{plan.priceLabel}</span>
                  <span className={`text-sm font-medium ${plan.highlight ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    /{plan.cycle === 'monthly' ? 'mês' : 'ano'}
                  </span>
                </div>

                <ul className="flex-1 space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className={`mt-0.5 rounded-full p-0.5 ${plan.highlight ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className={plan.highlight ? 'opacity-90' : 'text-muted-foreground'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`h-14 w-full rounded-2xl text-lg font-bold transition-all active:scale-[0.98] ${
                    plan.highlight 
                      ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90' 
                      : 'bg-primary shadow-xl shadow-primary/20'
                  }`}
                >
                  Começar agora
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
                <li><Link to="/auth" className="hover:text-primary transition-colors">Acesso Administrativo</Link></li>
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
