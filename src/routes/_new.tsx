import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Flower2, Check, ArrowRight, Zap, Bot, Shield, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_new")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              <Flower2 className="h-5 w-5" />
            </div>
            <span className="font-display font-semibold text-lg">Seja Livre</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:flex">Entrar</Button>
            <Button>Assinar Agora</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            <span>Inteligência Artificial de Vanguarda para o seu Salão</span>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-medium tracking-tight mb-8">
            Julia AI: A recepção que nunca dorme.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Gestão inteligente de agendamentos no WhatsApp, 24 horas por dia. 
            Aumente a conversão e foque no que importa: o bem-estar das suas clientes.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="h-12 px-8">Agendar Demonstração</Button>
            <Button variant="outline" size="lg" className="h-12 px-8">Ver Preços</Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Bot, title: "IA Humanizada", desc: "Julia atende texto e áudio com tom acolhedor e focado em vendas." },
              { icon: Shield, title: "Segurança Total", desc: "RBAC, logs de auditoria e proteção robusta contra acessos indevidos." },
              { icon: BarChart, title: "CRM & Insights", desc: "Painel intuitivo com funis, previsões e comportamento de clientes." },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-background border border-border/40 shadow-sm">
                <f.icon className="h-10 w-10 text-primary mb-6" />
                <h3 className="font-display text-xl mb-3">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} Seja Livre AI Platform. O futuro da gestão de beleza.</p>
      </footer>
    </div>
  );
}
