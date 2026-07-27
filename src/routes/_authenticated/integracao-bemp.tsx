import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, KeyRound, Loader2, Save, PlugZap, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getBempSettings,
  saveBempSettings,
  testBempConnection,
} from "@/lib/bemp-config.functions";

export const Route = createFileRoute("/_authenticated/integracao-bemp")({
  head: () => ({
    meta: [
      { title: "Integração Bemp — Secretária virtual" },
      {
        name: "description",
        content: "Configure o domínio e o token de integração fornecidos pelo suporte da Bemp.",
      },
      { property: "og:title", content: "Integração Bemp — Secretária virtual" },
      {
        property: "og:description",
        content: "Domínio e token da conta Bemp usados pela secretária virtual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegracaoBempPage,
});

function IntegracaoBempPage() {
  const fetchSettings = useServerFn(getBempSettings);
  const saveSettings = useServerFn(saveBempSettings);
  const testConn = useServerFn(testBempConnection);
  const [dominio, setDominio] = useState("");
  const [token, setToken] = useState("");
  const [source, setSource] = useState<"db" | "env" | "none">("none");
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSettings();
        setDominio(data.dominio || "");
        setSource(data.source);
        setHasToken(data.hasToken);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchSettings]);

  async function onSave() {
    if (!dominio.trim() || !token.trim()) {
      toast.error("Preencha o domínio e o token");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({ data: { dominio: dominio.trim(), token: token.trim() } });
      toast.success("Credenciais Bemp atualizadas");
      setToken("");
      setSource("db");
      setHasToken(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testConn();
      if (r.ok) {
        setTestResult({ ok: true, msg: `Conexão OK — ${r.salonsCount} unidade(s) encontradas.` });
      } else {
        setTestResult({ ok: false, msg: r.error || "Falha na conexão" });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : "Erro" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link to="/painel" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">
              Integração Bemp
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Domínio e token fornecidos pelo suporte da Bemp
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                {source === "db" && (
                  <>Credenciais salvas nesta tela. {hasToken ? "Token configurado." : "Token não configurado."}</>
                )}
                {source === "env" && (
                  <>Usando credenciais padrão configuradas pelo sistema. Salve abaixo para sobrescrever com as suas.</>
                )}
                {source === "none" && (
                  <>Nenhuma credencial configurada. A secretária virtual não conseguirá acessar a Bemp até você salvar.</>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dominio">Domínio Bemp</Label>
                <Input
                  id="dominio"
                  value={dominio}
                  onChange={(e) => setDominio(e.target.value)}
                  placeholder="ex.: sejalivrebyinezmoreira"
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  Apenas o subdomínio, sem <code>.bemp.app</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token de API</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={hasToken ? "•••••••• (deixe em branco para manter o atual)" : "Cole o token fornecido pelo suporte"}
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  Por segurança, o token nunca é exibido depois de salvo.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTest}
                  disabled={testing || saving}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlugZap className="h-4 w-4" />
                  )}
                  Testar conexão
                </Button>
                <Button
                  onClick={onSave}
                  disabled={saving || !dominio.trim() || !token.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                    testResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Onde encontrar?</h3>
          <p className="text-xs text-muted-foreground">
            O domínio é o mesmo endereço que você usa para acessar a Bemp
            (<code>seu-dominio.bemp.app</code>). O token de API é fornecido pelo
            suporte da Bemp — solicite pelo canal de atendimento se ainda não tiver.
          </p>
        </Card>
      </main>
    </div>
  );
}
