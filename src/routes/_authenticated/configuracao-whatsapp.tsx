import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Save, PlugZap, CheckCircle2, XCircle, Copy, ExternalLink, QrCode, Loader2, AlertCircle, RefreshCw, ShieldAlert, Activity } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppQr } from "@/components/whatsapp-qr";
import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  testWhatsAppConnection,
} from "@/lib/whatsapp-config.functions";
import {
  getWhatsAppHealth,
  refreshWhatsAppHealth,
} from "@/lib/whatsapp-health.functions";

type Health = {
  checkedAt: string;
  ok: boolean;
  status: "connected" | "expired" | "invalid" | "unconfigured" | "error";
  message: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
};

export const Route = createFileRoute("/_authenticated/configuracao-whatsapp")({
  head: () => ({
    meta: [
      { title: "Configuração do WhatsApp — Secretária virtual" },
      {
        name: "description",
        content: "Configure as credenciais do WhatsApp Cloud API da Meta para a secretária virtual.",
      },
      { property: "og:title", content: "Configuração do WhatsApp — Secretária virtual" },
      {
        property: "og:description",
        content: "Insira Access Token, Phone Number ID, App Secret e Verify Token da Meta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracaoWhatsAppPage,
});

function ConfiguracaoWhatsAppPage() {
  const fetchSettings = useServerFn(getWhatsAppSettings);
  const saveSettings = useServerFn(saveWhatsAppSettings);
  const testConn = useServerFn(testWhatsAppConnection);
  const fetchHealth = useServerFn(getWhatsAppHealth);
  const runHealth = useServerFn(refreshWhatsAppHealth);

  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  const [source, setSource] = useState<"db" | "env" | "none">("none");
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [hasAppSecret, setHasAppSecret] = useState(false);
  const [hasVerifyToken, setHasVerifyToken] = useState(false);
  const [savedPhoneNumberId, setSavedPhoneNumberId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; formatted: string; verifiedName: string; digits: string; link: string }
    | { ok: false; error: string }
    | null
  >(null);

  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/public/whatsapp`);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSettings();
        setSource(data.source);
        setHasAccessToken(data.hasAccessToken);
        setHasAppSecret(data.hasAppSecret);
        setHasVerifyToken(data.hasVerifyToken);
        setSavedPhoneNumberId(data.phoneNumberId);
        setPhoneNumberId(data.phoneNumberId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchSettings]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const h = (await fetchHealth()) as Health | null;
        if (!cancelled) setHealth(h);
      } catch {
        // silencia — permissões podem faltar
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchHealth]);

  async function onRefreshHealth() {
    setHealthLoading(true);
    try {
      const h = (await runHealth()) as Health;
      setHealth(h);
      if (h.ok) toast.success("Conexão OK");
      else toast.error(h.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao verificar");
    } finally {
      setHealthLoading(false);
    }
  }

  async function onSave() {
    if (!accessToken.trim() || !phoneNumberId.trim() || !appSecret.trim() || !verifyToken.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        data: {
          accessToken: accessToken.trim(),
          phoneNumberId: phoneNumberId.trim(),
          appSecret: appSecret.trim(),
          verifyToken: verifyToken.trim(),
        },
      });
      toast.success("Credenciais do WhatsApp salvas");
      setSource("db");
      setHasAccessToken(true);
      setHasAppSecret(true);
      setHasVerifyToken(true);
      setSavedPhoneNumberId(phoneNumberId.trim());
      setAccessToken("");
      setAppSecret("");
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
        setTestResult(r as { ok: true; formatted: string; verifiedName: string; digits: string; link: string });
        toast.success("Conexão com a Meta OK");
      } else {
        setTestResult({ ok: false, error: (r as { error: string }).error });
        toast.error("Falha na conexão");
      }
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : "Erro" });
    } finally {
      setTesting(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
  }

  const link = testResult && testResult.ok ? testResult.link : savedPhoneNumberId ? `https://wa.me/${savedPhoneNumberId.replace(/\D/g, "")}` : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link to="/painel" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">
              Configuração do WhatsApp
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Credenciais da Meta Cloud API
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <HealthCard health={health} loading={healthLoading} onRefresh={onRefreshHealth} />


        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status da conexão</CardTitle>
            <CardDescription>
              Verifique se as credenciais estão presentes antes de testar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                {source === "db" && (
                  <>
                    <p>Credenciais salvas nesta tela.</p>
                    <p>Phone Number ID: <span className="font-medium text-foreground">{savedPhoneNumberId || "—"}</span></p>
                  </>
                )}
                {source === "env" && (
                  <p>Usando credenciais padrão configuradas pelo sistema. Salve abaixo para sobrescrever com as suas.</p>
                )}
                {source === "none" && (
                  <p>Nenhuma credencial configurada. A secretária virtual não conseguirá enviar/receber mensagens até você salvar.</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <BadgeStatus ok={hasAccessToken} label="Access Token" />
                  <BadgeStatus ok={hasAppSecret} label="App Secret" />
                  <BadgeStatus ok={hasVerifyToken} label="Verify Token" />
                  <BadgeStatus ok={!!savedPhoneNumberId} label="Phone Number ID" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Credenciais da Meta</CardTitle>
            <CardDescription>
              Obtenha esses valores no painel do Meta Developers (WhatsApp → API Setup).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="ex.: 123456789012345"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={hasAccessToken ? "•••••••• (deixe em branco para manter o atual)" : "Cole o Access Token permanente da Meta"}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Por segurança, o token nunca é exibido depois de salvo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appSecret">App Secret</Label>
              <Input
                id="appSecret"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={hasAppSecret ? "•••••••• (deixe em branco para manter o atual)" : "Cole o App Secret do aplicativo Meta"}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Usado para validar a assinatura dos webhooks recebidos.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verifyToken">Verify Token</Label>
              <Input
                id="verifyToken"
                type="password"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder={hasVerifyToken ? "•••••••• (deixe em branco para manter o atual)" : "Crie um token para validação do webhook"}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Token que você também deve colar no campo Verify Token do Meta Developers.
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
                disabled={saving || !accessToken.trim() || !phoneNumberId.trim() || !appSecret.trim() || !verifyToken.trim()}
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
                <div className="space-y-1">
                  {testResult.ok ? (
                    <>
                      <p>Conexão OK</p>
                      <p>Número: <span className="font-medium">{testResult.formatted}</span></p>
                      {testResult.verifiedName && <p>Nome verificado: <span className="font-medium">{testResult.verifiedName}</span></p>}
                    </>
                  ) : (
                    <p>{testResult.error}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Webhook</CardTitle>
            <CardDescription>
              Cole essa URL no campo "Webhook URL" do Meta Developers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs font-mono break-all">
              <span className="flex-1">{webhookUrl || "Carregando URL…"}</span>
              <button
                type="button"
                onClick={() => webhookUrl && copy(webhookUrl)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title="Copiar URL"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>1. No Meta Developers, vá em WhatsApp → Configuration.</p>
              <p>2. Em Webhook, clique em Edit e cole a URL acima.</p>
              <p>3. No campo Verify Token, use exatamente o mesmo valor salvo acima.</p>
              <p>4. Subscreva o campo <code>messages</code>.</p>
            </div>
          </CardContent>
        </Card>

        {link && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Link e QR Code</CardTitle>
              <CardDescription>
                Envie esse link para clientes iniciarem uma conversa com o número conectado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs break-all">
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-primary hover:underline"
                >
                  {link}
                </a>
                <button
                  type="button"
                  onClick={() => copy(link)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Copiar link"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Abrir WhatsApp"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="flex justify-center">
                <WhatsAppQr link={link} />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function BadgeStatus({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function HealthCard({
  health,
  loading,
  onRefresh,
}: {
  health: Health | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const tone =
    health?.status === "connected"
      ? { bg: "border-emerald-200 bg-emerald-50", text: "text-emerald-900", Icon: CheckCircle2, label: "Conectado" }
      : health?.status === "expired"
        ? { bg: "border-destructive/30 bg-destructive/10", text: "text-destructive", Icon: ShieldAlert, label: "Token expirado" }
        : health?.status === "invalid"
          ? { bg: "border-destructive/30 bg-destructive/10", text: "text-destructive", Icon: ShieldAlert, label: "Token inválido" }
          : health?.status === "unconfigured"
            ? { bg: "border-amber-200 bg-amber-50", text: "text-amber-900", Icon: AlertCircle, label: "Não configurado" }
            : health?.status === "error"
              ? { bg: "border-amber-200 bg-amber-50", text: "text-amber-900", Icon: XCircle, label: "Erro de conexão" }
              : { bg: "border-muted bg-muted/40", text: "text-muted-foreground", Icon: Activity, label: "Aguardando primeira verificação" };

  const checkedAt = health?.checkedAt
    ? new Date(health.checkedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Saúde da conexão
          </CardTitle>
          <CardDescription>
            Verificação automática a cada 15 min direto na Meta.
          </CardDescription>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
          title="Verificar agora"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Verificar
        </button>
      </CardHeader>
      <CardContent>
        <div className={`flex items-start gap-2 rounded-md border p-3 text-xs ${tone.bg} ${tone.text}`}>
          <tone.Icon className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="font-medium">{tone.label}</p>
            {health && (
              <>
                <p className="opacity-90">{health.message}</p>
                {health.displayPhoneNumber && (
                  <p>
                    Número: <span className="font-medium">{health.displayPhoneNumber}</span>
                    {health.verifiedName ? ` — ${health.verifiedName}` : ""}
                  </p>
                )}
                {checkedAt && <p className="opacity-70">Última verificação: {checkedAt}</p>}
              </>
            )}
            {!health && (
              <p className="opacity-80">
                Clique em "Verificar" para executar a primeira checagem.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
