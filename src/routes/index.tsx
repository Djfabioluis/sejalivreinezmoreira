{/* Execute esta instrucao no projeto: # Prompt para o Lovable — Message ID retornado mas mensagem não chegou (instância sem sessão ativa)

## Contexto

Depois da última correção ("instância `julia-main` não existia na API, corrigido"), o sistema reportou envio bem-sucedido com Message ID `3EB06E21E4E905556DAF64`, mas a mensagem **não chegou** no WhatsApp do número de teste — que é meu número real e está ativo.

**Hipótese:** ao corrigir o problema de "instância não existe", pode ter sido criada uma instância **nova** na Evolution API (via `createInstance()`), mas essa instância nova não tem nenhuma sessão de WhatsApp autenticada — ninguém escaneou o QR Code para conectá-la a um número real. Isso explicaria por que a API aceita o envio e retorna um Message ID válido (gerado localmente pelo Baileys/Evolution ao montar a mensagem) sem que a entrega de fato aconteça pela rede do WhatsApp.

## Tarefa

1. Identifique qual é o nome exato da instância que está configurada **agora** (depois da última correção) em `base_conhecimento` (id=20, campo de configuração da Evolution) ou nas variáveis de ambiente `EVOLUTION_API_URL`/instância padrão usada por `sendEvolutionText`.
2. Rode `getConnectionState(instance)` para essa instância específica (não a antiga `julia-main`) e me diga o resultado exato: `conectado`, `desconectado` ou `aguardando_qr`.
3. Se o resultado **não** for `conectado`:
   - Gere o QR Code com `getQrCode(instance)` e exiba na tela `/configuracao-whatsapp` (ou me dê uma forma de visualizá-lo agora).
   - Eu vou escanear esse QR Code com o WhatsApp do número `41999102791` para autenticar a sessão de verdade.
   - Depois de eu confirmar que escaneei, rode `getConnectionState` de novo e só prossiga quando o status vier `conectado`.
4. Depois de confirmado `conectado`, repita o envio de teste (pode ser o mesmo botão "Teste de 2 minutos" ou um follow-up manual com dados realistas) e me informe o novo Message ID e horário exato.
5. **Importante:** não confie apenas no `res.ok`/Message ID retornado pela Evolution API como prova de entrega — isso só confirma que a mensagem foi aceita e enfileirada, não que chegou ao destinatário. Se a Evolution API expuser algum endpoint de status de entrega (webhook de `ack`/`DELIVERY_ACK`/`READ`, ou endpoint de consulta de status da mensagem por ID), use-o para confirmar a entrega real antes de reportar sucesso. Se não existir tal mecanismo hoje, sinalize isso como uma lacuna a corrigir: o sistema não tem como diferenciar "aceito pela API" de "efetivamente entregue".

## Resultado esperado

- Confirmação do status real da instância (`conectado` de verdade, com sessão ativa).
- QR Code gerado e escaneado, se necessário.
- Novo teste de envio com confirmação (por mim, checando o WhatsApp) de que a mensagem chegou.
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
              <Button size="lg" variant="outline" className="h-14 rounded-2xl px-10 text-lg border-primary/20 hover:bg-primary/5">
                Ver Demonstração
                <Play className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Recursos - Bento Grid Estilizado */}
      <section id="recursos" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="font-display text-4xl font-medium tracking-tight sm:text-6xl">Potência para o seu Salão</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              A Seja Livre AI não é apenas uma ferramenta, é o cérebro que otimiza cada aspecto do seu negócio.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Atendimento 24/7",
                desc: "Sua recepção nunca fecha. Julia atende, tira dúvidas e agenda em tempo real, mesmo de madrugada.",
                icon: MessageCircle,
                color: "bg-blue-500",
              },
              {
                title: "IA Pós-Atendimento",
                desc: "Follow-up inteligente que pergunta como foi o serviço e já sugere a próxima visita.",
                icon: CalendarClock,
                color: "bg-purple-500",
              },
              {
                title: "Cross-selling Ativo",
                desc: "Julia identifica oportunidades e oferece serviços complementares de forma elegante e natural.",
                icon: Sparkles,
                color: "bg-pink-500",
              },
              {
                title: "Recuperação de Leads",
                desc: "Nunca perca um cliente. O sistema identifica abandonos de agenda e faz o resgate automático.",
                icon: ShieldCheck,
                color: "bg-green-500",
              },
              {
                title: "CRM Inteligente",
                desc: "Dashboard completo com indicadores de saúde do cliente e previsões de faturamento.",
                icon: BarChart3,
                color: "bg-orange-500",
              },
              {
                title: "Agentes Autônomos",
                desc: "Crie múltiplos agentes para diferentes unidades, cada um com sua própria personalidade.",
                icon: Bot,
                color: "bg-indigo-500",
              },
            ].map((feature, i) => (
              <div key={i} className="group relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/50 p-10 transition-all hover:-translate-y-1 hover:border-primary/20 hover:bg-card">
                <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.color} text-white shadow-lg shadow-${feature.color.split('-')[1]}-500/20`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-4 font-display text-2xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-primary/5 opacity-30 skew-y-3" />
        
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="font-display text-4xl font-medium tracking-tight sm:text-6xl">O Plano Perfeito para o seu Salão</h2>
            
            <div className="mt-10 inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-background/50 p-1.5 backdrop-blur-md">
              <button 
                onClick={() => setCycle('monthly')}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold tracking-widest transition-all ${cycle === 'monthly' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/5'}`}
              >
                MENSAL
              </button>
              <button 
                onClick={() => setCycle('yearly')}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold tracking-widest transition-all ${cycle === 'yearly' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/5'}`}
              >
                ANUAL (-20%)
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative flex flex-col rounded-[3rem] p-12 transition-all hover:scale-[1.02] ${
                  plan.highlight 
                    ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30 ring-4 ring-primary/20' 
                    : 'bg-card border border-border/40 shadow-xl'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-accent-foreground shadow-xl">
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
