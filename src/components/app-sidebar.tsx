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
  TrendingUp,
  CalendarClock,
  Bot,
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
  { title: "Dashboard", url: "/painel", icon: LayoutDashboard, group: "Visão Geral", key: "painel" },
  { title: "Agenda Inteligente", url: "/agendar", icon: CalendarClock, group: "Operação", key: "agendar" },
  { title: "Julia AI", url: "/aprendizado-ia", icon: Bot, group: "Operação", key: "aprendizado-ia" },
  { title: "Conversas", url: "/agendar", icon: MessageCircle, group: "Operação", key: "agendar" },
  { title: "Clientes", url: "/usuarios", icon: Users, group: "Operação", key: "usuarios" },
  { title: "CRM Inteligente", url: "/crm", icon: TrendingUp, group: "Estratégico", key: "crm" },
  { title: "Follow-up", url: "/crm", icon: ClipboardList, group: "Estratégico", key: "crm" },

  { title: "Oportunidades", url: "/crm", icon: Sparkles, group: "Estratégico", key: "crm" },
  { title: "Campanhas", url: "/crm", icon: TrendingUp, group: "Estratégico", key: "crm" },
  { title: "Beauty Club", url: "/assinatura", icon: Flower2, group: "Fidelização", key: "__always" },
  { title: "Profissionais", url: "/operadores", icon: UserCog, group: "Gestão", key: "operadores" },
  { title: "Unidades", url: "/base-conhecimento", icon: BookOpen, group: "Gestão", key: "base-conhecimento" },
  { title: "Financeiro", url: "/crm", icon: CreditCard, group: "Gestão", key: "crm" },
  { title: "Analytics", url: "/crm", icon: TrendingUp, group: "Inteligência", key: "crm" },
  { title: "Relatórios", url: "/auditoria-sugestoes", icon: ClipboardList, group: "Inteligência", key: "auditoria-sugestoes" },
  { title: "Central IA", url: "/aprendizado-ia", icon: Brain, group: "Inteligência", key: "aprendizado-ia" },
  { title: "Agentes WhatsApp", url: "/agentes-whatsapp", icon: QrCode, group: "Configuração", key: "config-whatsapp" },
  { title: "Configurações", url: "/configuracao-whatsapp", icon: UserCog, group: "Configuração", key: "config-whatsapp" },
  { title: "Perfil", url: "/perfil", icon: UserCircle, group: "Conta", key: "__always" },
  { title: "Ajuda", url: "/perfil", icon: UserCircle, group: "Conta", key: "__always" },
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar shadow-xl transition-all duration-300">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 py-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
            <Flower2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="font-display text-xl leading-none tracking-tight text-white">
                Seja Livre
              </p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                AI Platform
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group} className="px-3 py-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                {group}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {visibleItems
                  .filter((i) => i.group === group)
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                        className="h-10 px-3 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-white data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:shadow-md data-[active=true]:shadow-primary/20"
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4.5 w-4.5 shrink-0" />
                          <span className="text-sm font-medium">{item.title}</span>
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
