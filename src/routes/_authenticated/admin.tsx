import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyPermissions } from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // A rota pai _authenticated já garante que o usuário está logado.
    // Aqui verificamos se ele é ADMIN.
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
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  return <Outlet />;
}
