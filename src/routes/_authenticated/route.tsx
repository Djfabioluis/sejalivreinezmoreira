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
          staleTime: 5 * 60_000,
          gcTime: 10 * 60_000,
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


function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur">
          <SidebarTrigger />
          <div className="ml-1 hidden text-sm text-muted-foreground sm:block">
            <span className="font-display text-base text-foreground">Seja Livre</span>
            <span className="mx-2 text-border">/</span>
            <span>Painel da secretária virtual</span>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
