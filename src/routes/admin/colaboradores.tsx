import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserPlus, 
  FileText,
  UserCheck,
  UserMinus,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useQuery } from "@tanstack/react-query";
import { getCollaborators } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/colaboradores")({
  component: AdminColaboradores,
});

function AdminColaboradores() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: colaboradoresData, isLoading } = useQuery({
    queryKey: ["admin-collaborators"],
    queryFn: () => getCollaborators(),
  });

  const colaboradores = colaboradoresData || [];


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ATIVO": return <Badge className="bg-green-50 text-green-700 border-none">Ativo</Badge>;
      case "INATIVO": return <Badge className="bg-gray-100 text-gray-700 border-none">Inativo</Badge>;
      case "BLOQUEADO": return <Badge className="bg-red-50 text-red-700 border-none">Bloqueado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContractBadge = (contract: string) => {
    switch (contract) {
      case "Assinado": return <Badge className="bg-[#2D5A5B]/10 text-[#2D5A5B] border-none">Assinado</Badge>;
      case "Pendente": return <Badge className="bg-amber-50 text-amber-700 border-none">Pendente</Badge>;
      case "Atrasado": return <Badge className="bg-red-50 text-red-700 border-none">Atrasado</Badge>;
      default: return <Badge variant="outline">{contract}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#2D5A5B]">Colaboradores</h1>
          <p className="text-[#2D5A5B]/60">Gerencie o cadastro e perfis dos profissionais.</p>
        </div>
        <Button className="bg-[#2D5A5B] hover:bg-[#1E3F3F] text-white rounded-xl gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D5A5B]/40" />
              <Input 
                placeholder="Buscar por nome, CPF ou e-mail..." 
                className="pl-10 border-[#2D5A5B]/10 focus-visible:ring-[#2D5A5B] rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-[#2D5A5B]/10 text-[#2D5A5B] rounded-xl gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          <div className="rounded-xl border border-[#F5F7F7] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F5F7F7]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Nome</TableHead>
                  <TableHead className="text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Contato</TableHead>
                  <TableHead className="text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Modalidade</TableHead>
                  <TableHead className="text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                  <TableHead className="text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Contrato</TableHead>
                  <TableHead className="text-right text-[#2D5A5B]/60 font-bold uppercase text-[10px] tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#2D5A5B]/40">
                      Carregando colaboradores...
                    </TableCell>
                  </TableRow>
                ) : colaboradores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[#2D5A5B]/40">
                      Nenhum colaborador encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradores.map((colab) => (
                    <TableRow key={colab.id} className="hover:bg-[#FDFCFB]/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-bold text-[#2D5A5B]">{colab.full_name}</p>
                          <p className="text-[10px] text-[#2D5A5B]/50 font-medium uppercase">{colab.cpf}</p>
                        </div>
                      </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm text-[#2D5A5B]/70">{colab.email}</p>
                        <p className="text-xs text-[#2D5A5B]/50">{colab.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#2D5A5B]/70 font-medium">{colab.modality}</TableCell>
                    <TableCell>{getStatusBadge(colab.status)}</TableCell>
                    <TableCell>{getContractBadge(colab.contract)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#2D5A5B]/5 text-[#2D5A5B]">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#2D5A5B]/10 shadow-lg">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#2D5A5B]/5 focus:text-[#2D5A5B]">
                            <FileText className="h-4 w-4" /> Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#2D5A5B]/5 focus:text-[#2D5A5B]">
                            <UserCheck className="h-4 w-4" /> Ativar/Inativar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                            <AlertCircle className="h-4 w-4" /> Bloquear Acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
