import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  QrCode,
  Info,
  Loader2,
  Trash2,
  PlugZap,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAgentes,
  criarAgente,
  gerarQrAgente,
  statusAgente,
  desconectarAgente,
  removerAgente,
  type AgenteWa,
} from "@/lib/agentes-whatsapp.functions";

export const Route = createFileRoute("/_authenticated/agentes-whatsapp")({
  head: () => ({
    meta: [
      { title: "Agentes de WhatsApp — Salão Seja Livre" },
      {
        name: "description",
        content:
          "Adicione agentes de WhatsApp, conecte o número por QR Code e deixe a IA atender automaticamente.",
      },
      { property: "og:title", content: "Agentes de WhatsApp — Salão Seja Livre" },
      {
        property: "og:description",
        content: "Conecte números de WhatsApp por QR Code e gerencie os agentes de atendimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentesWhatsAppPage,
});

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatSaved(digits: string) {
  const d = digits.startsWith("55") ? digits.slice(2) : digits;
  return maskPhone(d);
}

function StatusBadge({ status }: { status: AgenteWa["status"] }) {
  if (status === "conectado")
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Conectado</Badge>;
  if (status === "aguardando_qr") return <Badge variant="secondary">Aguardando QR</Badge>;
  return <Badge variant="outline">Desconectado</Badge>;
}

function AgentesWhatsAppPage() {
  const fetchList = useServerFn(listAgentes);
  const create = useServerFn(criarAgente);
  const genQr = useServerFn(gerarQrAgente);
  const checkStatus = useServerFn(statusAgente);
  const disconnect = useServerFn(desconectarAgente);
  const remove = useServerFn(removerAgente);

  const [items, setItems] = useState<AgenteWa[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [tipo, setTipo] = useState<"feminino" | "masculino">("feminino");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrAgente, setQrAgente] = useState<AgenteWa | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await fetchList();
      setItems(data.items);
      setConfigured(data.configured);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Enquanto o QR estiver aberto, confere a conexão a cada 5s.
  useEffect(() => {
    if (!qrOpen || !qrAgente) return;
    const id = setInterval(async () => {
      try {
        const r = await checkStatus({ data: { id: qrAgente.id } });
        if (r.status === "conectado") {
          clearInterval(id);
          setQrOpen(false);
          toast.success("Agente conectado com sucesso!");
          void reload();
        }
      } catch {
        /* silencia enquanto aguarda */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [qrOpen, qrAgente, checkStatus, reload]);

  async function handleCreate() {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Informe o número com DDD.");
      return;
    }
    setSaving(true);
    try {
      const res = await create({
        data: { tipo, telefone: digits, origin: window.location.origin },
      });
      if (res.error || !res.agente) {
        setConnectionError(res.error ?? "Não foi possível criar o agente.");
        return;
      }
      setConnectionError(null);
      setAddOpen(false);
      setTelefone("");
      setQrAgente(res.agente);
      setQrData(res.qr);
      setQrOpen(true);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar agente");
    } finally {
      setSaving(false);
    }
  }

  async function openQr(agente: AgenteWa) {
    setQrAgente(agente);
    setQrData(null);
    setQrOpen(true);
    setQrLoading(true);
    try {
      const r = await genQr({ data: { id: agente.id, origin: window.location.origin } });
      if (r.status === "conectado") {
        setQrOpen(false);
        toast.success("Este agente já está conectado.");
        void reload();
        return;
      }
      setQrData(r.qr);
      if (!r.qr) toast.error("Não recebi o QR Code do servidor Evolution.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar QR Code");
    } finally {
      setQrLoading(false);
    }
  }

  async function handleDisconnect(agente: AgenteWa) {
    try {
      await disconnect({ data: { id: agente.id } });
      toast.success("Sessão desconectada.");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    }
  }

  async function handleRemove(agente: AgenteWa) {
    if (!window.confirm(`Remover o agente ${agente.nome} (${formatSaved(agente.telefone)})?`)) return;
    try {
      await remove({ data: { id: agente.id } });
      toast.success("Agente removido.");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Agentes e envio de mensagens automáticas
        </p>
      </header>

      {!configured && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Servidor Evolution não configurado</CardTitle>
            <CardDescription>
              Cadastre a URL e a chave da Evolution API para conectar números por QR Code.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {connectionError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Evolution API indisponível</CardTitle>
            <CardDescription className="text-foreground">{connectionError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Button className="w-full" size="lg" onClick={() => setAddOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar agente
      </Button>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Nenhum agente WhatsApp conectado. Adicione seu primeiro agente para enviar mensagens
            pelo WhatsApp.
          </p>
          <Button className="mt-6" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar agente WhatsApp
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {a.nome}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · agente {a.tipo}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {formatSaved(a.telefone)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Button size="sm" variant="outline" onClick={() => void openQr(a)}>
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    {a.status === "conectado" ? "Reconectar" : "Ver QR"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDisconnect(a)}
                    disabled={a.status !== "conectado"}
                  >
                    <PlugZap className="mr-1.5 h-3.5 w-3.5" />
                    Desconectar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleRemove(a)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: adicionar agente */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar agente WhatsApp</DialogTitle>
            <DialogDescription>
              Escolha a voz do agente e informe o número que vai atender.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo do agente</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "feminino" | "masculino")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feminino">Agente feminino (Julia)</SelectItem>
                  <SelectItem value="masculino">Agente masculino (Bruno)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 rounded-xl border p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Este agente envia apenas mensagens relacionadas a atendimentos para os clientes.
                Por isso, é importante que seja um número já conhecido pelo cliente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Número do WhatsApp</Label>
              <Input
                id="telefone"
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving || telefone.length < 14}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Adicionar e gerar QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: QR Code */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar {qrAgente?.nome ?? "agente"}</DialogTitle>
            <DialogDescription>
              No celular, abra o WhatsApp → Aparelhos conectados → Conectar um aparelho e escaneie
              o código abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid place-items-center py-2">
            {qrLoading || (!qrData && qrOpen) ? (
              <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                {qrLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "QR indisponível"}
              </div>
            ) : (
              <img
                src={qrData ?? ""}
                alt={`QR Code para conectar o agente ${qrAgente?.nome ?? ""} ao WhatsApp`}
                className="h-56 w-56 rounded-xl border bg-white p-2"
              />
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => qrAgente && void openQr(qrAgente)}
              disabled={qrLoading || !qrAgente}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar QR
            </Button>
            <Button onClick={() => setQrOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
