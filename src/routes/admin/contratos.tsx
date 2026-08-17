import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Search, 
  Filter, 
  FileUp, 
  ArrowRight,
  Eye,
  Download,
  Trash2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/contratos")({
  component: AdminContratos,
});

function AdminContratos() {
  const [searchTerm, setSearchTerm] = useState("");

  const contratos = [
    { id: 1, professional: "Ana Paula Silva", type: "Parceria", number: "CTR-2026-001", status: "ASSINADO", date: "10/01/2026", expiration: "10/01/2027" },
    { id: 2, professional: "Roberto Santos", type: "Locação", number: "CTR-2026-015", status: "AGUARDANDO_ASSINATURA", date: "15/02/2026", expiration: "15/02/2027" },
    { id: 3, professional: "Juliana Mendes", type: "Parceria", number: "CTR-2026-022", status: "ASSINADO", date: "05/03/2026", expiration: "05/03/2027" },
    { id: 4, professional: "Carlos Ferreira", type: "Prestação de Serviço", number: "CTR-2026-038", status: "CANCELADO", date: "20/03/2026", expiration: "-" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSINADO": return <Badge className="bg-green-50 text-green-700 border-none">Assinado</Badge>;
      case "AGUARDANDO_ASSINATURA": return <Badge className="bg-amber-50 text-amber-700 border-none">Pendente</Badge>;
      case "CANCELADO": return <Badge className="bg-red-50 text-red-700 border-none">Cancelado</Badge>;
      case "EXPIRADO": return <Badge className="bg-gray-100 text-gray-700 border-none">Expirado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#2D5A5B]">Gestão de Contratos</h1>
          <p className="text-[#2D5A5B]/60">Monitore assinaturas e validade dos contratos.</p>
        </div>
        <Button className="bg-[#2D5A5B] hover:bg-[#1E3F3F] text-white rounded-xl gap-2">
          <FileUp className="h-4 w-4" />
          Gerar Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm rounded-2xl bg-[#2D5A5B] text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <FileCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Total Ativos</p>
                <h3 className="text-3xl font-bold">42</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[#2D5A5B]/60 text-xs font-medium uppercase tracking-wider">Pendentes</p>
                <h3 className="text-3xl font-bold text-[#2D5A5B]">08</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600">
                <Filter className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[#2D5A5B]/60 text-xs font-medium uppercase tracking-wider">A vencer (30d)</p>
                <h3 className="text-3xl font-bold text-[#2D5A5B]">03</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D5A5B]/40" />
              <Input 
                placeholder="Buscar por profissional ou número do contrato..." 
                className="pl-10 border-[#2D5A5B]/10 focus-visible:ring-[#2D5A5B] rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-[#2D5A5B]/10 text-[#2D5A5B] rounded-xl gap-2">
              <Filter className="h-4 w-4" />
              Filtrar Status
            </Button>
          </div>

          <div className="rounded-xl border border-[#F5F7F7] overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F5F7F7]">
                <tr>
                  <th className="px-6 py-4 text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Profissional / Nº</th>
                  <th className="px-6 py-4 text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Modalidade</th>
                  <th className="px-6 py-4 text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Vencimento</th>
                  <th className="px-6 py-4 text-right text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F7F7]">
                {contratos.map((contrato) => (
                  <tr key={contrato.id} className="hover:bg-[#FDFCFB]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-[#2D5A5B]">{contrato.professional}</p>
                        <p className="text-[10px] text-[#2D5A5B]/50 font-medium">{contrato.number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#2D5A5B]/70 font-medium text-sm">{contrato.type}</td>
                    <td className="px-6 py-4">{getStatusBadge(contrato.status)}</td>
                    <td className="px-6 py-4 text-[#2D5A5B]/70 text-sm">{contrato.expiration}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2D5A5B] hover:bg-[#2D5A5B]/5">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2D5A5B] hover:bg-[#2D5A5B]/5">
                        <Download className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
