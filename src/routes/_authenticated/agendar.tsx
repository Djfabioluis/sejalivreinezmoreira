import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MessageSquare, 
  Send, 
  RefreshCcw, 
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AiSimulator } from "@/components/ai-simulator";
import { useServerFn } from "@tanstack/react-start";
import { 
  listWAConversations, 
  getWAConversation,
  markAsRead, 
  updateConversationStatus, 
  sendManualWAMessage,
  extractConversationMessageText,
  type WAConversation 
} from "@/lib/whatsapp-inbox.functions";
import { listAgentes } from "@/lib/agentes-whatsapp.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agendar")({
  head: () => ({
    title: "Central de Atendimento WhatsApp — Julia",
    meta: [{ name: "description", content: "Gerencie conversas do WhatsApp em tempo real." }]
  }),
  component: AgendarPage,
});

function AgendarPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [conversations, setConversations] = useState<WAConversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<WAConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [instanceFilter, setInstanceFilter] = useState("todos");
  const [agentes, setAgentes] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchConversations = useServerFn(listWAConversations);
  const fetchOneConversation = useServerFn(getWAConversation);
  const fetchAgentes = useServerFn(listAgentes);
  const fnMarkAsRead = useServerFn(markAsRead);
  const fnUpdateStatus = useServerFn(updateConversationStatus);
  const fnSendMessage = useServerFn(sendManualWAMessage);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadList = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [resultSettle, agsResultSettle] = await Promise.allSettled([
        fetchConversations({ 
          data: {
            search: debouncedSearch, 
            status: statusFilter, 
            instance: instanceFilter === "todos" ? undefined : instanceFilter,
            page,
            pageSize: 20
          }
        }),
        fetchAgentes()
      ]);

      if (resultSettle.status === "fulfilled") {
        setConversations(resultSettle.value.conversations);
        setTotal(resultSettle.value.total);
      } else {
        console.error("Erro ao carregar conversas:", resultSettle.reason);
        toast.error("Erro ao carregar conversas");
      }

      if (agsResultSettle.status === "fulfilled") {
        setAgentes(agsResultSettle.value.items);
      } else {
        console.error("Erro ao carregar agentes:", agsResultSettle.reason);
        // Não mostrar toast se falhar apenas agentes, para não impedir a Caixa de Entrada (Item 7)
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao carregar lista");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadConversation = async (phone: string, silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const conv = await fetchOneConversation({ data: { phone } });
      setSelectedConversation(conv);
      if (conv && conv.unread_count > 0) {
        fnMarkAsRead({ data: { phone } }).catch(console.error);
        setConversations(prev => prev.map(c => c.phone === phone ? { ...c, unread_count: 0 } : c));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  useEffect(() => { loadList(); }, [debouncedSearch, statusFilter, instanceFilter, page]);
  useEffect(() => {
    if (selectedPhone) loadConversation(selectedPhone);
    else setSelectedConversation(null);
  }, [selectedPhone]);

  useEffect(() => {
    const channel = supabase
      .channel("wa_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversas" }, (payload) => {
        const updated = payload.new as any;
        if (selectedPhone && selectedPhone === updated.phone) loadConversation(selectedPhone, true);
        loadList(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedPhone]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedPhone || !inputText.trim() || sending) return;
    setSending(true);
    try {
      await fnSendMessage({ data: { phone: selectedPhone, text: inputText } });
      setInputText("");
      await loadConversation(selectedPhone, true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedPhone) return;
    try {
      await fnUpdateStatus({ data: { phone: selectedPhone, status: newStatus } });
      toast.success("Status atualizado");
      loadConversation(selectedPhone, true);
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const num = phone.split(":").pop() || "";
    if (num.length === 13 && num.startsWith("55")) {
      return `+55 (${num.slice(2,4)}) ${num.slice(4,9)}-${num.slice(9)}`;
    }
    return `+${num}`;
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl h-[calc(100vh-100px)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Secretária Virtual</h1>
        <Button variant="outline" size="sm" onClick={() => loadList()}><RefreshCcw className="h-4 w-4 mr-2" /> Atualizar</Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="inbox">Caixa de entrada</TabsTrigger>
          <TabsTrigger value="simulator">Simulador da IA</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="flex-1 flex gap-4 overflow-hidden mt-4">
          <Card className={`w-full md:w-1/3 flex flex-col overflow-hidden ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b space-y-3 bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar contato..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberta">Abertas</SelectItem>
                    <SelectItem value="waiting_for_unit_selection">Aguardando Unidade</SelectItem>
                    <SelectItem value="aguardando_unidade">Escolha a unidade</SelectItem>
                    <SelectItem value="conectado_sem_unidade">Conectado sem unidade</SelectItem>
                    <SelectItem value="aguardando_humano">Triagem</SelectItem>
                    <SelectItem value="resolvida">Resolvidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Instância" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {agentes.map(a => <SelectItem key={a.instancia} value={a.instancia}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {loading && <div className="p-4 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>}
                {!loading && conversations.map((conv) => (
                  <div key={conv.phone} className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedPhone === conv.phone ? 'bg-muted border-l-4 border-l-primary' : ''}`} onClick={() => setSelectedPhone(conv.phone)}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm truncate">{conv.contact_name || formatPhoneDisplay(conv.phone)}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <StatusBadge status={conv.status} />
                      {conv.unread_count > 0 && <Badge variant="default" className="rounded-full h-5 px-1.5 text-[10px]">{conv.unread_count}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {total > 20 && (
              <div className="p-2 border-t flex justify-between items-center bg-muted/10">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-[10px] text-muted-foreground">Pág. {page + 1} de {Math.ceil(total / 20)}</span>
                <Button variant="ghost" size="sm" disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </Card>
          <Card className={`flex-1 flex flex-col overflow-hidden ${!selectedPhone ? 'hidden md:flex items-center justify-center bg-muted/10' : 'flex'}`}>
            {!selectedPhone ? (
              <div className="text-center space-y-2 opacity-60"><MessageSquare className="h-12 w-12 mx-auto" /><p>Selecione uma conversa</p></div>
            ) : (
              <>
                <div className="p-3 border-b flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedPhone(null)}><ChevronLeft className="h-5 w-5" /></Button>
                    <div>
                      <h3 className="text-sm font-bold">{selectedConversation?.contact_name || formatPhoneDisplay(selectedPhone)}</h3>
                      <p className="text-[10px] text-muted-foreground">{selectedConversation?.instance}</p>
                    </div>
                  </div>
                  <Select value={selectedConversation?.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="waiting_for_unit_selection">Aguardando Unidade</SelectItem>
                      <SelectItem value="aguardando_unidade">Escolha a unidade</SelectItem>
                      <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                      <SelectItem value="aguardando_humano">Triagem</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedConversation?.status === "waiting_for_unit_selection" && (
                  <div className="bg-amber-50 border-b border-amber-200 p-2 flex items-center justify-between px-4">
                    <span className="text-xs text-amber-800 font-medium">Aguardando escolha da unidade</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] border-amber-300 hover:bg-amber-100"
                      onClick={() => window.location.href = "/agentes-whatsapp"}
                    >
                      Escolher Unidade
                    </Button>
                  </div>
                )}
                <ScrollArea className="flex-1 p-4 bg-muted/5">
                  <div className="space-y-4">
                    {loadingConv && <div className="flex justify-center p-4"><RefreshCcw className="h-6 w-6 animate-spin opacity-20" /></div>}
                    {selectedConversation?.messages.map((m: any, idx: number) => (
                      <div key={m.id || idx} className={`flex gap-2 ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-card border rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'}`}>
                          {extractConversationMessageText(m)}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-card">
                  <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <Textarea placeholder="Responda..." className="min-h-[44px] max-h-32 resize-none" value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={sending} />
                    <Button type="submit" size="icon" disabled={sending || !inputText.trim()}>{sending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                  </form>
                </div>
              </>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="simulator" className="flex-1 mt-4"><AiSimulator /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    aberta: "bg-blue-100 text-blue-700",
    waiting_for_unit_selection: "bg-purple-100 text-purple-700",
    aguardando_humano: "bg-orange-100 text-orange-700",
    resolvida: "bg-green-100 text-green-700"
  };
  const labels: Record<string, string> = {
    waiting_for_unit_selection: "Aguardando Unidade"
  };
  return <Badge variant="secondary" className={`text-[8px] py-0 h-3 ${styles[status] || ""}`}>{labels[status] || status}</Badge>;
}