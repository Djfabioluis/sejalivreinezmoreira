import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listAccessUsers } from "@/lib/access.functions";
import { createAppUser, deleteAppUser } from "@/lib/users-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Users, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Seja Livre" },
      { name: "description", content: "Adicione ou remova usuários da secretaria virtual." },
      { property: "og:title", content: "Usuários — Seja Livre" },
      { property: "og:description", content: "Gestão de contas de acesso à secretaria virtual." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const qc = useQueryClient();
  const load = useServerFn(listAccessUsers);
  const create = useServerFn(createAppUser);
  const del = useServerFn(deleteAppUser);

  const { data, isLoading } = useQuery({
    queryKey: ["access-users"],
    queryFn: () => load(),
  });

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "operador" as "admin" | "operador" | "none",
  });

  const createMut = useMutation({
    mutationFn: (input: typeof form) =>
      create({
        data: {
          email: input.email.trim(),
          password: input.password,
          name: input.name.trim() || undefined,
          role: input.role === "none" ? undefined : input.role,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setForm({ email: "", password: "", name: "", role: "operador" });
      qc.invalidateQueries({ queryKey: ["access-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar usuário"),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["access-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao excluir usuário"),
  });

  const users = data?.users ?? [];
  const me = data?.me;
  const needsBootstrap = data?.needsBootstrap;
  const isAdminView = needsBootstrap || users.length > 0;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Adicione ou remova contas de acesso à secretaria virtual.
          </p>
        </div>
      </header>

      {!isAdminView && !isLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Apenas administradores podem gerenciar usuários.
          </AlertDescription>
        </Alert>
      )}

      {isAdminView && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-4 w-4" /> Novo usuário
              </CardTitle>
              <CardDescription>
                A conta é criada já confirmada. Compartilhe a senha com o usuário — recomende trocá-la no primeiro acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.email || !form.password) {
                    toast.error("Informe email e senha.");
                    return;
                  }
                  createMut.mutate(form);
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Maria da Silva"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="maria@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha inicial</Label>
                  <Input
                    id="password"
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Papel inicial</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="none">Sem papel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? "Criando..." : "Criar usuário"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contas existentes</CardTitle>
              <CardDescription>
                A exclusão remove o acesso e apaga a conta permanentemente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
              ) : (
                <ul className="divide-y">
                  {users.map((u) => {
                    const isMe = u.id === me;
                    return (
                      <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{u.name ?? u.email ?? u.id}</p>
                            {isMe && <Badge variant="secondary">você</Badge>}
                            {u.roles.map((r) => (
                              <Badge key={r} variant="outline" className="capitalize">
                                {r}
                              </Badge>
                            ))}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isMe || deleteMut.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A conta <b>{u.email}</b> será apagada permanentemente e perderá o acesso.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMut.mutate(u.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
