import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Files,
  Book,
  Bell,
  Settings,
  LogOut,
  Flower2,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMyPermissions } from "@/hooks/use-my-permissions";
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
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Colaboradores", url: "/admin/colaboradores", icon: Users },
  { title: "Contratos", url: "/admin/contratos", icon: FileText },
  { title: "Aguardando Assinatura", url: "/admin/assinaturas", icon: Clock, badge: "8" },
  { title: "Documentos", url: "/admin/documentos", icon: Files },
  { title: "Manual", url: "/admin/manual", icon: Book },
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell, badge: "4" },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

export function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { data: perms } = useMyPermissions();

  const isActive = (path: string) => 
    path === "/admin" ? currentPath === "/admin" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-[#FDFCFB] shadow-xl">
      <SidebarHeader className="border-b border-sidebar-border/50 py-4">
        <div className="flex items-center gap-3 px-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2D5A5B] text-white shadow-lg shadow-[#2D5A5B]/20">
            <Flower2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="font-display text-lg font-bold leading-none tracking-tight text-[#2D5A5B]">
                Seja Livre
              </p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D5A5B]/60">
                Admin Portal
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-[#2D5A5B]/40">
            Menu Administrativo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-10 px-3 transition-all duration-200 hover:bg-[#2D5A5B]/5 hover:text-[#2D5A5B] data-[active=true]:bg-[#2D5A5B] data-[active=true]:text-white data-[active=true]:shadow-md data-[active=true]:shadow-[#2D5A5B]/20"
                  >
                    <Link to={item.url} className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      {item.badge && !collapsed && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F3F3] text-[10px] font-bold text-[#2D5A5B]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[#2D5A5B]/70 hover:bg-[#2D5A5B]/5 hover:text-[#2D5A5B]"
            onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              window.location.replace("/auth");
            }}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sair"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
