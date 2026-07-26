import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listAccessUsers, setUserRole, type AppRole } from "@/lib/access.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/acessos")({
  head: () => ({
    meta: [
      { title: "Níveis de acesso — Seja Livre" },
      { name: "description", content: "Gerencie os papéis (admin/operador) dos usuários da secretaria virtual." },
      { property: "og:title", content: "Níveis de acesso — Seja Livre" },
      { property: "og:description", content: "Controle quem pode administrar ou operar a secretaria virtual." },
    ],
  }),
  component: AcessosPage,
});

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  operador: "Operador",
};

const ROLE_DESC: Record<AppRole, string> = {
  admin: "Gerencia acessos, configurações, prompts e integrações.",
  operador: "Uso operacional: atendimentos, agenda e leads.",
};

function AcessosPage() {
  const qc = useQueryClient();
  const load = useServerFn(listAccessUsers);
  const save = useServerFn(setUserRole);

  const { data, isLoading, error } = useQuery({
    queryKey: ["access-users"],
    queryFn: () => load(),
  });

  const mutation = useMutation({
    mutationFn: (input: { userId: string; role: AppRole; enabled: boolean }) =>
      save({ data: input }),
    onSuccess: () => {
      toast.success("Acessos atualizados.");
      qc.invalidateQueries({ queryKey: ["access-users"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar.");
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl tracking-tight">Níveis de acesso</h1>
          <p className="text-sm text-muted-foreground">
            Defina quem é administrador e quem é operador da secretaria virtual.
          </p>
        </div>
      </header>

      {data?.needsBootstrap && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Nenhum administrador cadastrado</AlertTitle>
          <AlertDescription>
            Marque um usuário como <strong>Administrador</strong> para começar. Após isso, apenas administradores poderão gerenciar acessos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Papéis disponíveis</CardTitle>
          <CardDescription>Um usuário pode ter mais de um papel simultaneamente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
            <div key={r} className="rounded-lg border p-3">
              <p className="font-medium">{ROLE_LABEL[r]}</p>
              <p className="text-sm text-muted-foreground">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            {data?.users.length ?? 0} usuário(s) com acesso ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Erro ao carregar usuários."}
            </p>
          ) : !data || data.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem permissão para listar usuários — peça a um administrador que atribua seu papel.
            </p>
          ) : (
            <ul className="divide-y">
              {data.users.map((u) => {
                const isMe = u.id === data.me;
                return (
                  <li key={u.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{u.name || u.email || u.id}</p>
                        {isMe && <Badge variant="secondary">você</Badge>}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => {
                        const enabled = u.roles.includes(r);
                        return (
                          <label key={r} className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={enabled}
                              disabled={mutation.isPending}
                              onCheckedChange={(v) =>
                                mutation.mutate({ userId: u.id, role: r, enabled: v })
                              }
                            />
                            <span>{ROLE_LABEL[r]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
