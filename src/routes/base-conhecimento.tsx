import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getBaseConhecimento, saveBaseConhecimento } from "@/lib/knowledge.functions";

export const Route = createFileRoute("/base-conhecimento")({
  head: () => ({
    meta: [
      { title: "Base de conhecimento — Secretária virtual" },
      {
        name: "description",
        content: "Edite as instruções que a secretária virtual usa para agendar consultas.",
      },
      { property: "og:title", content: "Base de conhecimento — Secretária virtual" },
      {
        property: "og:description",
        content: "Edite o prompt e as regras que orientam a IA de agendamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BaseConhecimentoPage,
});

function BaseConhecimentoPage() {
  const fetchKb = useServerFn(getBaseConhecimento);
  const saveKb = useServerFn(saveBaseConhecimento);
  const [conteudo, setConteudo] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchKb();
        setConteudo(data.conteudo ?? "");
        setUpdatedAt(data.updated_at ?? null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchKb]);

  async function onSave() {
    setSaving(true);
    try {
      await saveKb({ data: { conteudo } });
      setUpdatedAt(new Date().toISOString());
      toast.success("Base de conhecimento atualizada");
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
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">
              Base de conhecimento da IA
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Instruções aplicadas ao chat web e ao WhatsApp
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Prompt do sistema</h2>
            <p className="text-xs text-muted-foreground">
              Descreva o tom, regras e fluxo que a secretária virtual deve seguir. As
              ferramentas (unidades, serviços, horários, agendar) já estão conectadas — foque
              nas instruções de conversa.
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
                rows={22}
                className="font-mono text-xs leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {updatedAt ? `Atualizado em ${new Date(updatedAt).toLocaleString("pt-BR")}` : ""}
                </p>
                <Button onClick={onSave} disabled={saving || !conteudo.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
