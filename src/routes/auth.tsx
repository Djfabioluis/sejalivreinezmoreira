import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/painel",
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Secretária Virtual" },
      { name: "description", content: "Acesse o painel da secretária virtual." },
    ],
  }),
  component: AuthPage,
});

function safeNext(next: string): string {
  // Permitir só paths same-origin relativos.
  if (!next.startsWith("/") || next.startsWith("//")) return "/painel";
  return next;
}

const NEXT_KEY = "auth:next";

function storeNext(target: string) {
  try {
    localStorage.setItem(NEXT_KEY, safeNext(target));
  } catch {
    /* armazenamento indisponível */
  }
}

function consumeNext(fallback: string): string {
  try {
    const stored = localStorage.getItem(NEXT_KEY);
    localStorage.removeItem(NEXT_KEY);
    return stored ? safeNext(stored) : safeNext(fallback);
  } catch {
    return safeNext(fallback);
  }
}

function AuthPage() {
  const { next } = useSearch({ from: "/auth" });
  
  const target = safeNext(next);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(consumeNext(target));
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) go();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [target]);


  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        storeNext(target);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email se solicitado.");
      }
      window.location.replace(target);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    setBusy(true);
    try {
      storeNext(target);
      // redirect_uri deve ser uma URL pública same-origin (nunca rota protegida).
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      // Não depender somente do evento: confirme o usuário após o helper salvar a sessão.
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error ?? new Error("Não foi possível confirmar seu acesso.");
      window.location.replace(consumeNext(target));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no Google");
      setBusy(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-lg bg-primary text-primary-foreground p-2 w-fit mb-2">
            <CalendarClock className="h-5 w-5" />
          </div>
          <CardTitle>{mode === "signin" ? "Entrar" : "Criar conta"}</CardTitle>
          <CardDescription>Acesse sua Secretária Virtual Bemp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={signInGoogle}
            disabled={busy}
          >
            Continuar com Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>
          <form onSubmit={submitEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Não tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                  Entrar
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
