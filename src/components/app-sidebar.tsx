import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  Sparkles,
  ClipboardList,
  Flower2,
  UserCog,
  LogOut,
  UserCircle,
  ShieldCheck,
  Users,
  Hand,
  CreditCard,
  KeyRound,
  Lock,
  QrCode,
  Brain,
  



} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SandboxToggle } from "@/components/sandbox-toggle";
import { useMyPermissions } from "@/hooks/use-my-permissions";

const items = [
  { title: "Painel", url: "/painel", icon: LayoutDashboard, group: "Operação", key: "painel" },
  { title: "CRM Inteligente", url: "/crm", icon: TrendingUp, group: "Operação", key: "crm" },
  { title: "Secretária virtual", url: "/agendar", icon: MessageCircle, group: "Operação", key: "agendar" },
  { title: "Base de conhecimento", url: "/base-conhecimento", icon: BookOpen, group: "Configuração", key: "base-conhecimento" },
  { title: "Boas-vindas", url: "/boas-vindas", icon: Hand, group: "Configuração", key: "boas-vindas" },
  { title: "Operadores", url: "/operadores", icon: UserCog, group: "Configuração", key: "operadores" },
  { title: "Sugestões", url: "/sugestoes", icon: Sparkles, group: "Configuração", key: "sugestoes" },
  { title: "Auditoria de sugestões", url: "/auditoria-sugestoes", icon: ClipboardList, group: "Configuração", key: "auditoria-sugestoes" },
  { title: "Aprendizado da IA", url: "/aprendizado-ia", icon: Brain, group: "Configuração", key: "aprendizado-ia" },
  { title: "Integração Bemp", url: "/integracao-bemp", icon: KeyRound, group: "Configuração", key: "integracao-bemp" },
  { title: "Configuração do WhatsApp", url: "/configuracao-whatsapp", icon: MessageCircle, group: "Configuração", key: "config-whatsapp" },
  { title: "WhatsApp — Agentes", url: "/agentes-whatsapp", icon: QrCode, group: "Configuração", key: "config-whatsapp" },
  { title: "Níveis de acesso", url: "/acessos", icon: ShieldCheck, group: "Configuração", key: "acessos" },
  { title: "Usuários", url: "/usuarios", icon: Users, group: "Configuração", key: "usuarios" },
  { title: "Permissões", url: "/permissoes", icon: Lock, group: "Configuração", key: "permissoes" },
  { title: "Assinantes", url: "/assinantes", icon: CreditCard, group: "Configuração", key: "assinantes" },
  { title: "Minha assinatura", url: "/assinatura", icon: CreditCard, group: "Conta", key: "__always" },
  { title: "Meu perfil", url: "/perfil", icon: UserCircle, group: "Conta", key: "__always" },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const { data: perms } = useMyPermissions();
  const allowed = new Set(perms?.permissions ?? []);
  const isAdmin = perms?.isAdmin ?? false;

  const visibleItems = items.filter((i) => {
    if (i.key === "__always") return true;
    if (isAdmin) return true;
    return allowed.has(i.key);
  });

  const groups = Array.from(new Set(visibleItems.map((i) => i.group)));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Flower2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-lg leading-none tracking-tight text-sidebar-foreground">
                Seja Livre
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
                Secretária virtual
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems
                  .filter((i) => i.group === group)
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter>
          <div className="space-y-2 px-2 pb-2">
            <SandboxToggle compact />
            <button
              type="button"
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                try {
                  const qc = (window as unknown as { __queryClient?: { cancelQueries: () => void; clear: () => void } }).__queryClient;
                  qc?.cancelQueries();
                  qc?.clear();
                } catch { /* noop */ }
                await supabase.auth.signOut();
                window.location.replace("/auth");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
