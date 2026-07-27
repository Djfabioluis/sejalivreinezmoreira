import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  MessageCircle,
  Save,
  PlugZap,
  CheckCircle2,
  XCircle,
  Copy,
  Loader2,
  AlertCircle,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUltraMsgSettings,
  saveUltraMsgSettings,
  syncUltraMsgWebhook,
  testUltraMsgConnection,
} from "@/lib/ultramsg-config.functions";

export const Route = createFileRoute("/_authenticated/configuracao-ultramsg")({
  head: () => ({
    meta: [
      { title: "Configuração do UltraMsg — Secretária virtual" },
      {
        name: "description",
        content:
          "Conecte o WhatsApp da empresa via UltraMsg (QR Code) para que a Julia responda automaticamente.",
      },
      { property: "og:title", content: "Configuração do UltraMsg — Secretária virtual" },
      {
        property: "og:description",
        content: "Insira Instance ID, Token e Webhook Token do UltraMsg.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracaoUltraMsgPage,
});

function ConfiguracaoUltraMsgPage() {
  const fetchSettings = useServerFn(getUltraMsgSettings);
  const saveSettings = useServerFn(saveUltraMsgSettings);
  const testConn = useServerFn(testUltraMsgConnection);
  const syncWebhook = useServerFn(syncUltraMsgWebhook);

  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [webhookToken, setWebhookToken] = useState("");

  const [savedInstanceId, setSavedInstanceId] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [hasWebhookToken, setHasWebhookToken] = useState(false);
  const [configured, setConfigured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingWebhook, setSyncingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);
  const [webhookResult, setWebhookResult] = useState<
    { ok: true; webhookUrl: string } | { ok: false; error: string; webhookUrl?: string } | null
  >(null);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSettings();
        setSavedInstanceId(data.instanceId);
        setInstanceId(data.instanceId);
        setHasToken(data.hasToken);
        setHasWebhookToken(data.hasWebhookToken);
        setConfigured(data.configured);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchSettings]);

  const webhookUrl = useMemo(() => {
    if (!origin) return "";
    const t = webhookToken.trim();
    if (!t) return "";
    return `${origin}/api/public/ultramsg?token=${encodeURIComponent(t)}`;
  }, [origin, webhookToken]);

  const needsWebhookTokenToCopy = configured && hasWebhookToken && !webhookToken.trim();

  const qrPanelUrl = savedInstanceId
    ? `https://user.ultramsg.com/instance/${encodeURIComponent(savedInstanceId)}`
    : "https://user.ultramsg.com/";

  async function onSave() {
    if (!instanceId.trim() || !token.trim() || !webhookToken.trim()) {
      toast.error("Preencha Instance ID, Token e Webhook Token");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        data: {
          instanceId: instanceId.trim(),
          token: token.trim(),
          webhookToken: webhookToken.trim(),
          origin,
        },
      });
      toast.success("Credenciais do UltraMsg salvas");
      if (result.webhook?.ok) {
        setWebhookResult(result.webhook);
        toast.success("Webhook ativado automaticamente na UltraMsg");
      } else if (result.webhook) {
        setWebhookResult(result.webhook);
        toast.warning("Credenciais salvas, mas o webhook não foi ativado automaticamente");
      }
      setSavedInstanceId(instanceId.trim());
      setHasToken(true);
      setHasWebhookToken(true);
      setConfigured(true);
      setToken("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onSyncWebhook() {
    if (!origin) {
      toast.error("Origem da página indisponível");
      return;
    }
    setSyncingWebhook(true);
    setWebhookResult(null);
    try {
      const result = await syncWebhook({ data: { origin } });
      setWebhookResult(result);
      if (result.ok) {
        toast.success("Webhook ativado na UltraMsg");
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao ativar webhook";
      setWebhookResult({ ok: false, error: message });
      toast.error(message);
    } finally {
      setSyncingWebhook(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = (await testConn()) as { ok: true } | { ok: false; error: string };
      if (r.ok) {
        setTestResult({ ok: true });
        toast.success("Conexão com UltraMsg OK");
      } else {
        setTestResult({ ok: false, error: r.error });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link to="/painel" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">
              Configuração do UltraMsg
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              WhatsApp via QR Code (WhatsApp Web)
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Como funciona</CardTitle>
            <CardDescription>
              O UltraMsg conecta o WhatsApp da empresa via QR Code (WhatsApp Web), sem precisar
              de aprovação da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>1. Crie uma instância em <a href="https://user.ultramsg.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">user.ultramsg.com</a> e escaneie o QR Code com o WhatsApp do celular.</p>
            <p>2. Copie o <strong>Instance ID</strong> (ex.: <code>instance12345</code>) e o <strong>Token</strong> da instância.</p>
            <p>3. Defina um <strong>Webhook Token</strong> (qualquer string secreta) — usaremos para validar as chamadas recebidas.</p>
            <p>4. Salve abaixo, teste a conexão e cole a URL de webhook no painel do UltraMsg (aba <em>Webhook</em>).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                <p>
                  {configured
                    ? "Credenciais salvas."
                    : "Nenhuma credencial configurada. A secretária virtual não conseguirá enviar/receber por UltraMsg até salvar."}
                </p>
                <p>Instance ID: <span className="font-medium text-foreground">{savedInstanceId || "—"}</span></p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <BadgeStatus ok={!!savedInstanceId} label="Instance ID" />
                  <BadgeStatus ok={hasToken} label="Token" />
                  <BadgeStatus ok={hasWebhookToken} label="Webhook Token" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Credenciais</CardTitle>
            <CardDescription>Pegue esses valores no painel do UltraMsg.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceId">Instance ID</Label>
              <Input
                id="instanceId"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="ex.: instance12345"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={hasToken ? "•••••••• (deixe em branco para manter o atual)" : "Cole o Token da instância"}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Por segurança, o token nunca é exibido depois de salvo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookToken">Webhook Token</Label>
              <Input
                id="webhookToken"
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder={hasWebhookToken ? "•••••••• (defina um novo para trocar)" : "Crie uma string secreta (ex.: uma senha forte)"}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Esse valor precisa aparecer na URL de webhook (?token=...) que cadastramos no UltraMsg.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
              <Button variant="outline" size="sm" onClick={onTest} disabled={testing || saving || !configured}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                Testar conexão
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSyncWebhook}
                disabled={syncingWebhook || saving || !configured}
              >
                {syncingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Ativar webhook
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || !instanceId.trim() || !token.trim() || !webhookToken.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                    <p>UltraMsg respondeu com sucesso.</p>
                  ) : (
                    <p>{testResult.error}</p>
                  )}
                </div>
              </div>
            )}

            {webhookResult && (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                  webhookResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {webhookResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  {webhookResult.ok ? (
                    <p>Webhook configurado na UltraMsg para receber mensagens.</p>
                  ) : (
                    <p>{webhookResult.error}</p>
                  )}
                  {webhookResult.webhookUrl && (
                    <p className="font-mono break-all">{webhookResult.webhookUrl}</p>
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
              Cole essa URL em <em>UltraMsg → Instance → Webhook</em> e ative <em>message received</em>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs font-mono break-all">
              <span className="flex-1">
                {webhookUrl ||
                  (needsWebhookTokenToCopy
                    ? "Digite o mesmo Webhook Token salvo para gerar a URL completa"
                    : "Preencha o Webhook Token para gerar a URL")}
              </span>
              <button
                type="button"
                onClick={() => webhookUrl && copy(webhookUrl)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title="Copiar URL"
                disabled={!webhookUrl}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>1. Acesse o painel do UltraMsg: <a href={qrPanelUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{qrPanelUrl}</a></p>
              <p>2. Vá em <em>Instance settings → Webhook URL</em> e cole a URL acima.</p>
              <p>3. A URL precisa terminar com <code>?token=...</code>; sem esse token o webhook será bloqueado.</p>
              <p>4. Se preferir, clique em <strong>Ativar webhook</strong> acima para o sistema configurar isso automaticamente.</p>
              <p>5. Marque <em>message received</em> e salve.</p>
              <p>6. Envie uma mensagem de teste — a Julia responderá automaticamente.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Já uso Meta Cloud API</CardTitle>
            <CardDescription>
              Você pode manter as duas integrações ativas simultaneamente. Cada canal responde
              usando o mesmo agente Julia e o mesmo histórico.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <Link to="/configuracao-whatsapp" className="text-primary hover:underline">
              Ir para configuração da Meta Cloud API →
            </Link>
          </CardContent>
        </Card>
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
