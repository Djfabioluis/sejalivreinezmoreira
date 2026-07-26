import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listOperadores,
  createOperador,
  updateOperador,
  deleteOperador,
  type Operador,
} from "@/lib/operadores.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, UserCog, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/operadores")({
  head: () => ({
    meta: [
      { title: "Operadores — Seja Livre" },
      {
        name: "description",
        content:
          "Cadastre, edite e desative atendentes humanos que recebem os handoffs da secretária virtual.",
      },
      { property: "og:title", content: "Operadores — Seja Livre" },
      {
        property: "og:description",
        content: "Gerencie a equipe humana de atendimento da secretária virtual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperadoresPage,
});

type FormState = {
  nome: string;
  email: string;
  telefone: string;
  observacoes: string;
};

const emptyForm: FormState = { nome: "", email: "", telefone: "", observacoes: "" };

function OperadoresPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["operadores"],
    queryFn: () => listOperadores(),
  });

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Operador | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["operadores"] });

  const createMut = useMutation({
    mutationFn: () =>
      createOperador({
        data: {
          nome: form.nome,
          email: form.email || null,
          telefone: form.telefone || null,
          observacoes: form.observacoes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Operador cadastrado");
      setOpenNew(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (payload: Parameters<typeof updateOperador>[0]["data"]) =>
      updateOperador({ data: payload }),
    onSuccess: () => {
      toast.success("Alterações salvas");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOperador({ data: { id } }),
    onSuccess: () => {
      toast.success("Operador removido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (op: Operador) => {
    setEditing(op);
    setForm({
      nome: op.nome,
      email: op.email ?? "",
      telefone: op.telefone ?? "",
      observacoes: op.observacoes ?? "",
    });
  };

  const submitEdit = () => {
    if (!editing) return;
    updateMut.mutate({
      id: editing.id,
      nome: form.nome,
      email: form.email || null,
      telefone: form.telefone || null,
      observacoes: form.observacoes || null,
    });
  };

  const operadores = data ?? [];
  const ativos = operadores.filter((o) => o.ativo).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Operadores</h1>
          <p className="text-sm text-muted-foreground">
            Atendentes humanos disponíveis para receber handoffs da secretária virtual.
          </p>
        </div>
        <Dialog
          open={openNew}
          onOpenChange={(v) => {
            setOpenNew(v);
            if (!v) setForm(emptyForm);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo operador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo operador</DialogTitle>
              <DialogDescription>
                Cadastre um atendente humano. Apenas o nome é obrigatório.
              </DialogDescription>
            </DialogHeader>
            <OperadorForm form={form} setForm={setForm} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenNew(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !form.nome.trim()}
              >
                {createMut.isPending ? "Salvando…" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4" />
              Equipe cadastrada
            </CardTitle>
            <CardDescription>
              {operadores.length} total · {ativos} ativos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : operadores.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum operador cadastrado ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {operadores.map((op) => (
                <li key={op.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{op.nome}</span>
                      <Badge variant={op.ativo ? "default" : "secondary"}>
                        {op.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {op.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {op.email}
                        </span>
                      )}
                      {op.telefone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {op.telefone}
                        </span>
                      )}
                    </div>
                    {op.observacoes && (
                      <p className="mt-1 text-xs text-muted-foreground">{op.observacoes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={op.ativo}
                        onCheckedChange={(checked) =>
                          updateMut.mutate({ id: op.id, ativo: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(op)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover ${op.nome}?`)) deleteMut.mutate(op.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar operador</DialogTitle>
            <DialogDescription>Atualize os dados de contato do atendente.</DialogDescription>
          </DialogHeader>
          <OperadorForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={updateMut.isPending || !form.nome.trim()}>
              {updateMut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OperadorForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="op-nome">Nome *</Label>
        <Input
          id="op-nome"
          value={form.nome}
          maxLength={120}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="op-email">Email</Label>
        <Input
          id="op-email"
          type="email"
          value={form.email}
          maxLength={255}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="op-tel">Telefone</Label>
        <Input
          id="op-tel"
          value={form.telefone}
          maxLength={40}
          placeholder="+55 41 99999-9999"
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="op-obs">Observações</Label>
        <Textarea
          id="op-obs"
          value={form.observacoes}
          maxLength={1000}
          rows={3}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        />
      </div>
    </div>
  );
}
