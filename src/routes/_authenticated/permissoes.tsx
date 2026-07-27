import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listOperadorPermissions,
  saveOperadorPermissions,
  saveDefaultPermissions,
  ALL_PERMISSIONS,
  type PermissionKey,
} from "@/lib/permissions.functions";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões — Seja Livre" },
      { name: "description", content: "Defina o que cada operador pode acessar." },
    ],
  }),
  component: PermissoesPage,
});

const LABELS: Record<PermissionKey, string> = {
  painel: "Dashboard",
  agendar: "Secretária virtual",
  "base-conhecimento": "Base de conhecimento",
  "boas-vindas": "Boas-vindas",
  operadores: "Operadores",
  sugestoes: "Sugestões (cross-sell)",
  "auditoria-sugestoes": "Auditoria de sugestões",
  "integracao-bemp": "Integração Bemp",
  acessos: "Níveis de acesso",
  usuarios: "Usuários",
  assinantes: "Assinantes",
  permissoes: "Permissões",
};

const ADMIN_ONLY: PermissionKey[] = ["acessos", "usuarios", "assinantes", "permissoes", "integracao-bemp"];

function PermissoesPage() {
  const me = useMyPermissions();
  const listFn = useServerFn(listOperadorPermissions);
  const saveOp = useServerFn(saveOperadorPermissions);
  const saveDef = useServerFn(saveDefaultPermissions);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["operador-permissions"],
    queryFn: () => listFn(),
    enabled: me.data?.isAdmin === true,
  });

  const mutOp = useMutation({
    mutationFn: (v: { userId: string; permissoes: PermissionKey[] }) =>
      saveOp({ data: v }),
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      qc.invalidateQueries({ queryKey: ["operador-permissions"] });
      qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
  });

  const mutDef = useMutation({
    mutationFn: (permissoes: PermissionKey[]) => saveDef({ data: { permissoes } }),
    onSuccess: () => {
      toast.success("Padrão atualizado");
      qc.invalidateQueries({ queryKey: ["operador-permissions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar"),
  });

  if (me.isLoading) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  }
  if (!me.data?.isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Apenas administradores podem gerenciar permissões.
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectable = ALL_PERMISSIONS.filter((p) => !ADMIN_ONLY.includes(p));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-2xl">Permissões dos operadores</h1>
        <p className="text-sm text-muted-foreground">
          Escolha quais áreas cada operador pode visualizar e interagir. Administradores sempre veem tudo.
        </p>
      </header>

      <DefaultsCard
        loading={q.isLoading}
        defaults={(q.data?.defaults as PermissionKey[]) ?? []}
        selectable={selectable}
        saving={mutDef.isPending}
        onSave={(p) => mutDef.mutate(p)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Operadores</CardTitle>
          <CardDescription>
            Marque as áreas liberadas para cada operador. Quando nada foi definido, aplica-se o padrão acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {q.isLoading && <Skeleton className="h-24 w-full" />}
          {!q.isLoading && (q.data?.operadores?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum operador cadastrado ainda.</p>
          )}
          {q.data?.operadores.map((op) => (
            <OperadorRow
              key={op.user_id}
              op={op}
              selectable={selectable}
              defaults={(q.data?.defaults as PermissionKey[]) ?? []}
              saving={mutOp.isPending}
              onSave={(perms) => mutOp.mutate({ userId: op.user_id, permissoes: perms })}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DefaultsCard({
  loading,
  defaults,
  selectable,
  saving,
  onSave,
}: {
  loading: boolean;
  defaults: PermissionKey[];
  selectable: PermissionKey[];
  saving: boolean;
  onSave: (p: PermissionKey[]) => void;
}) {
  const [state, setState] = useState<Set<PermissionKey> | null>(null);
  const current = state ?? new Set(defaults);
  const dirty = useMemo(() => {
    if (!state) return false;
    const a = [...state].sort().join("|");
    const b = [...defaults].sort().join("|");
    return a !== b;
  }, [state, defaults]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Padrão para novos operadores</CardTitle>
        <CardDescription>
          Aplicado automaticamente a operadores sem configuração individual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-16 w-full" /> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectable.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <Checkbox
                  checked={current.has(k)}
                  onCheckedChange={(v) => {
                    const next = new Set(current);
                    if (v) next.add(k); else next.delete(k);
                    setState(next);
                  }}
                />
                <span>{LABELS[k]}</span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button disabled={!dirty || saving} onClick={() => onSave([...current])}>
            {saving ? "Salvando..." : "Salvar padrão"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OperadorRow({
  op,
  selectable,
  defaults,
  saving,
  onSave,
}: {
  op: { user_id: string; email: string | null; name: string | null; permissoes: string[] | null };
  selectable: PermissionKey[];
  defaults: PermissionKey[];
  saving: boolean;
  onSave: (p: PermissionKey[]) => void;
}) {
  const initial = (op.permissoes ?? defaults) as PermissionKey[];
  const [state, setState] = useState<Set<PermissionKey>>(new Set(initial));
  const dirty = useMemo(() => {
    const a = [...state].sort().join("|");
    const b = [...initial].sort().join("|");
    return a !== b;
  }, [state, initial]);

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{op.name ?? op.email ?? op.user_id}</p>
          {op.email && op.name && (
            <p className="truncate text-xs text-muted-foreground">{op.email}</p>
          )}
          {op.permissoes === null && (
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Usando padrão</p>
          )}
        </div>
        <Button size="sm" disabled={!dirty || saving} onClick={() => onSave([...state])}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {selectable.map((k) => (
          <label key={k} className="flex items-center gap-2 rounded-md bg-muted/30 p-2 text-sm">
            <Checkbox
              checked={state.has(k)}
              onCheckedChange={(v) => {
                const next = new Set(state);
                if (v) next.add(k); else next.delete(k);
                setState(next);
              }}
            />
            <span>{LABELS[k]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
