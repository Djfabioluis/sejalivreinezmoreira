import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyPermissions } from "@/lib/permissions.functions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/__root")({
  beforeLoad: async ({ context }) => {
    // Acesso restrito a ADMIN
    const perms = await context.queryClient.ensureQueryData({
      queryKey: ["my-permissions"],
      queryFn: () => getMyPermissions(),
    });

    if (!perms.isAdmin) {
      throw redirect({
        to: "/painel",
      });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[#F5F7F7]">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
