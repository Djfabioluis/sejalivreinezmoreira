import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, 
  FileText, 
  Clock, 
  BookOpen, 
  ArrowRight,
  UserPlus,
  FileUp,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#2D5A5B]">Dashboard Administrativo</h1>
          <p className="text-[#2D5A5B]/60 text-lg">Seja Livre — Portal do Colaborador</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-[#2D5A5B] hover:bg-[#1E3F3F] text-white rounded-xl gap-2">
            <UserPlus className="h-4 w-4" />
            Cadastrar Colaborador
          </Button>
        </div>
      </header>

      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            title: "Colaboradores Ativos", 
            value: isLoading ? "..." : stats?.activeProfessionals.toString(), 
            icon: Users, 
            color: "bg-[#2D5A5B]/10 text-[#2D5A5B]" 
          },
          { 
            title: "Contratos Assinados", 
            value: isLoading ? "..." : stats?.signedContracts.toString(), 
            icon: FileText, 
            color: "bg-green-100 text-green-700" 
          },
          { 
            title: "Aguardando Assinatura", 
            value: isLoading ? "..." : stats?.pendingSignatures.toString(), 
            icon: Clock, 
            color: "bg-amber-100 text-amber-700" 
          },
          { 
            title: "Manual Pendente", 
            value: isLoading ? "..." : stats?.pendingManuals.toString(), 
            icon: BookOpen, 
            color: "bg-blue-100 text-blue-700" 
          },
        ].map((item, i) => (

          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#2D5A5B]/60">{item.title}</p>
                  <h3 className="text-3xl font-bold text-[#2D5A5B] mt-1">{item.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contratos Recentes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-[#2D5A5B]">Contratos Recentes</h2>
            <Button variant="link" className="text-[#2D5A5B] font-medium p-0 h-auto">
              Ver todos <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F5F7F7] text-[#2D5A5B]/60 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Profissional</th>
                    <th className="px-6 py-4 font-semibold">Modalidade</th>
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F7F7]">
                  {[
                    { name: "Ana Paula Silva", role: "Manicure", date: "15/08/2026", status: "Assinado", statusColor: "text-green-600 bg-green-50" },
                    { name: "Roberto Santos", role: "Cabeleireiro", date: "14/08/2026", status: "Pendente", statusColor: "text-amber-600 bg-amber-50" },
                    { name: "Juliana Mendes", role: "Esteticista", date: "12/08/2026", status: "Assinado", statusColor: "text-green-600 bg-green-50" },
                    { name: "Carlos Ferreira", role: "Cabeleireiro", date: "10/08/2026", status: "Atrasado", statusColor: "text-red-600 bg-red-50" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#FDFCFB] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#2D5A5B]">{row.name}</td>
                      <td className="px-6 py-4 text-[#2D5A5B]/70">{row.role}</td>
                      <td className="px-6 py-4 text-[#2D5A5B]/70">{row.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Ações Rápidas & Alertas */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[#2D5A5B] px-2">Pendências Urgentes</h2>
          <Card className="border-none shadow-sm rounded-2xl bg-[#2D5A5B] text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-white/60 text-sm font-medium">Contratos Atrasados</p>
                  <p className="text-3xl font-bold">8</p>
                </div>
              </div>
              <Button className="w-full mt-6 bg-white text-[#2D5A5B] hover:bg-white/90 rounded-xl font-bold">
                Resolver Agora
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {[
              { title: "Enviar novo manual", icon: FileUp, desc: "Publicar versão 2.1" },
              { title: "Ver notificações", icon: Bell, desc: "4 novas não lidas", badge: "4" },
            ].map((action, i) => (
              <Button key={i} variant="outline" className="w-full h-16 justify-between px-4 border-[#2D5A5B]/10 hover:bg-[#2D5A5B]/5 hover:text-[#2D5A5B] rounded-2xl group transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F5F7F7] rounded-lg group-hover:bg-[#2D5A5B]/10">
                    <action.icon className="h-5 w-5 text-[#2D5A5B]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#2D5A5B] leading-tight">{action.title}</p>
                    <p className="text-[10px] text-[#2D5A5B]/50 uppercase tracking-wider font-bold">{action.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#2D5A5B]/30 group-hover:text-[#2D5A5B] group-hover:translate-x-1 transition-all" />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
