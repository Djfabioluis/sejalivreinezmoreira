import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getWelcomeMessage,
  saveWelcomeMessage,
  DEFAULT_WELCOME,
} from "@/lib/welcome.functions";

export const Route = createFileRoute("/_authenticated/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Boas-vindas — Secretária virtual" },
      {
        name: "description",
        content: "Configure a mensagem inicial da secretária virtual no chat web.",
      },
      { property: "og:title", content: "Boas-vindas — Secretária virtual" },
      {
        property: "og:description",
        content: "Personalize a saudação da IA para receber os clientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoasVindasPage,
});

function BoasVindasPage() {
  const fetchWelcome = useServerFn(getWelcomeMessage);
  const saveWelcome = useServerFn(saveWelcomeMessage);
  const [conteudo, setConteudo] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWelcome();
        setConteudo(data.conteudo);
        setUpdatedAt(data.updated_at);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWelcome]);

  async function onSave() {
    setSaving(true);
    try {
      await saveWelcome({ data: { conteudo } });
      setUpdatedAt(new Date().toISOString());
      toast.success("Mensagem de boas-vindas atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">
              Mensagem de boas-vindas
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Primeira fala da IA quando o cliente abre o chat web
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Saudação inicial</h2>
            <p className="text-xs text-muted-foreground">
              Essa mensagem aparece antes de qualquer interação do cliente. Use emojis, o
              nome da atendente e uma pergunta curta para engajar (ex.: “Como posso te
              chamar?”).
            </p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <Textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={6}
                maxLength={2000}
                className="text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {updatedAt
                    ? `Atualizado em ${new Date(updatedAt).toLocaleString("pt-BR")}`
                    : "Ainda usando a mensagem padrão"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConteudo(DEFAULT_WELCOME)}
                    disabled={saving}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar padrão
                  </Button>
                  <Button onClick={onSave} disabled={saving || !conteudo.trim()}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Prévia</h3>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
            {conteudo || DEFAULT_WELCOME}
          </div>
        </Card>
      </main>
    </div>
  );
}
