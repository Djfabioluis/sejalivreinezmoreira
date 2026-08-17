import { createFileRoute } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminIndex,
});

function AdminIndex() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[#F5F7F7]">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-[#2D5A5B]">Dashboard Administrativo — Seja Livre</h1>
            <p className="text-[#2D5A5B]/60">Olá, Administrador! Bem-vindo ao portal de gestão.</p>
          </header>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#2D5A5B]/10">
              <p className="text-sm text-[#2D5A5B]/60">Total de Colaboradores</p>
              <h3 className="text-3xl font-bold text-[#2D5A5B]">0</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#2D5A5B]/10">
              <p className="text-sm text-[#2D5A5B]/60">Contratos Assinados</p>
              <h3 className="text-3xl font-bold text-[#2D5A5B]">0</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#2D5A5B]/10">
              <p className="text-sm text-[#2D5A5B]/60">Aguardando Assinatura</p>
              <h3 className="text-3xl font-bold text-[#2D5A5B]">0</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#2D5A5B]/10">
              <p className="text-sm text-[#2D5A5B]/60">Manuais Pendentes</p>
              <h3 className="text-3xl font-bold text-[#2D5A5B]">0</h3>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
