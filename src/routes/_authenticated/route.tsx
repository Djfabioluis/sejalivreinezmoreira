import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getMyEntitlement } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

const ENTITLEMENT_EXEMPT = new Set<string>(["/assinatura"]);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    if (!ENTITLEMENT_EXEMPT.has(location.pathname)) {
      try {
        const env = getStripeEnvironment();
        const ent = await context.queryClient.ensureQueryData({
          queryKey: ["entitlement", env, data.user.id],
          queryFn: () => getMyEntitlement({ data: { environment: env } }),
          staleTime: 30_000,
          gcTime: 60_000,

        });
        if (!ent.active) throw redirect({ to: "/assinatura" });
      } catch (e) {
        if (e && typeof e === "object" && "to" in (e as object)) throw e;
      }
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});


import { Search, Bell, Plus, LayoutGrid, Zap, Globe, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

function AuthenticatedLayout() {
  const { data: user } = useQuery({ queryKey: ["user"] });
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/60 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <SidebarTrigger className="hover:bg-accent" />
            <div className="relative hidden w-full max-w-md lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Busca global (⌘K)..." 
                className="h-9 w-full bg-secondary/50 pl-10 border-none ring-0 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-[11px] font-medium">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                IA Ativa
              </div>
              <span className="w-px h-3 bg-border mx-1" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3 w-3" />
                Evolution
              </div>
            </div>

            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-background"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-border/40 transition-transform hover:scale-105">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {user?.email?.substring(0, 2).toUpperCase() || "SL"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Minha Conta</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="cursor-pointer">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/assinatura" className="cursor-pointer">Assinatura</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={async () => {
                  const { supabase } = await import("@/integrations/supabase/client");
                  await supabase.auth.signOut();
                  window.location.replace("/auth");
                }}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="hidden sm:flex gap-2 shadow-lg shadow-primary/20 font-medium">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </header>
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
