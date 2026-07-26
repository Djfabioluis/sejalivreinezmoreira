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

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "Operação" },
  { title: "Secretária virtual", url: "/agendar", icon: MessageCircle, group: "Operação" },
  { title: "Base de conhecimento", url: "/base-conhecimento", icon: BookOpen, group: "Configuração" },
  { title: "Boas-vindas", url: "/boas-vindas", icon: Hand, group: "Configuração" },
  { title: "Operadores", url: "/operadores", icon: UserCog, group: "Configuração" },
  { title: "Sugestões", url: "/sugestoes", icon: Sparkles, group: "Configuração" },
  { title: "Auditoria de sugestões", url: "/auditoria-sugestoes", icon: ClipboardList, group: "Configuração" },
  { title: "Níveis de acesso", url: "/acessos", icon: ShieldCheck, group: "Configuração" },
  { title: "Usuários", url: "/usuarios", icon: Users, group: "Configuração" },
  { title: "Meu perfil", url: "/perfil", icon: UserCircle, group: "Conta" },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const groups = Array.from(new Set(items.map((i) => i.group)));

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
                {items
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
