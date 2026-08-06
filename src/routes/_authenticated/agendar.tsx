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
  transferConversationUnit,
  type WAConversation 
} from "@/lib/whatsapp-inbox.functions";

import { listAgentes } from "@/lib/agentes-whatsapp.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MediaMessageBody } from "@/components/wa-media-message";

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
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");

  const selectedPhoneRef = useRef<string | null>(null);
  const conversationsRef = useRef<WAConversation[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useServerFn(listWAConversations);
  const fetchOneConversation = useServerFn(getWAConversation);
  const fetchAgentes = useServerFn(listAgentes);
  const fnMarkAsRead = useServerFn(markAsRead);
  const fnUpdateStatus = useServerFn(updateConversationStatus);
  const fnSendMessage = useServerFn(sendManualWAMessage);
  const fnTransferUnit = useServerFn(transferConversationUnit);
  
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferring, setTransferring] = useState(false);


  // Sync refs to avoid closure staleness in realtime callbacks
  useEffect(() => { selectedPhoneRef.current = selectedPhone; }, [selectedPhone]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

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
      if (!conv) return;

      setSelectedConversation(conv);
      
      if (conv.unread_count > 0) {
        // Mark as read immediately in UI
        setConversations(prev => prev.map(c => c.phone === phone ? { ...c, unread_count: 0 } : c));
        // Then in backend
        fnMarkAsRead({ data: { phone } }).catch(console.error);
      }
    } catch (err) {
      console.error("Erro ao carregar conversa:", err);
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  useEffect(() => { loadList(); }, [debouncedSearch, statusFilter, instanceFilter, page]);
  
  useEffect(() => {
    if (selectedPhone) loadConversation(selectedPhone);
    else setSelectedConversation(null);
  }, [selectedPhone]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("wa-conversas-inbox")
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "wa_conversas" }, 
        (payload) => {
          const updated = (payload.new || payload.old) as any;
          console.log("Realtime event received:", payload.eventType, updated?.phone);
          if (!updated || !updated.phone) return;

          // 1. Update the conversation list
          setConversations(prev => {
            const exists = prev.find(c => c.phone === updated.phone);
            let newList = [...prev];
            
            if (exists) {
              newList = prev.map(c => c.phone === updated.phone ? { ...c, ...updated } : c);
            } else {
              // Only add if it matches current filters (simplified: always add if on page 0)
              if (page === 0) {
                newList = [updated as WAConversation, ...prev];
              }
            }
            
            // Re-sort by updated_at
            return newList.sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });

          // 2. Update the open conversation if it matches
          if (selectedPhoneRef.current === updated.phone) {
            // We need the full history, so we fetch it
            fetchOneConversation({ data: { phone: updated.phone } })
              .then(fullConv => {
                if (fullConv && selectedPhoneRef.current === updated.phone) {
                  setSelectedConversation(fullConv);
                  // Auto mark as read if it's the open conversation and has unread
                  if (fullConv.unread_count > 0) {
                    fnMarkAsRead({ data: { phone: updated.phone } }).catch(() => {});
                    setConversations(p => p.map(c => c.phone === updated.phone ? { ...c, unread_count: 0 } : c));
                  }
                }
              })
              .catch(err => console.error("Error refreshing open conversation:", err));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
        console.log("Realtime channel status:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [page]); // Re-subscribe only on page change if needed, otherwise stable

  // Auto-scroll on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [selectedConversation?.messages?.length]);

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

  const handleTransfer = async (targetUnitId: string) => {
    if (!selectedPhone || transferring) return;
    setTransferring(true);
    try {
      await fnTransferUnit({ 
        data: { 
          phone: selectedPhone, 
          targetUnitId, 
          reason: "Transferência manual pelo operador" 
        } 
      });
      toast.success("Atendimento transferido com sucesso");
      setShowTransferDialog(false);
      loadConversation(selectedPhone, true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao transferir atendimento");
    } finally {
      setTransferring(false);
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
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Esquerda: Lista de Conversas */}
      <Card className={`w-full lg:w-[380px] flex flex-col overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm ${selectedPhone ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-5 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-bold">Conversas</h1>
            <Badge variant="outline" className={`text-[9px] px-2 py-0.5 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-500 border-amber-500/20 bg-amber-500/5'}`}>
              {realtimeStatus === 'SUBSCRIBED' ? 'LIVE' : 'CONECTANDO'}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou número..." 
              className="pl-10 h-10 bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
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
      {/* Centro: Chat */}
      <Card className={`flex-1 flex flex-col overflow-hidden border-none shadow-xl bg-card/80 backdrop-blur-sm ${!selectedPhone ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
        {!selectedPhone ? (
          <div className="text-center space-y-4 opacity-40 animate-pulse">
            <MessageSquare className="h-16 w-16 mx-auto text-primary" />
            <p className="font-display text-lg">Selecione uma conversa para começar</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedPhone(null)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {selectedConversation?.contact_name?.substring(0, 2).toUpperCase() || "WA"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-bold leading-none">{selectedConversation?.contact_name || formatPhoneDisplay(selectedPhone)}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {selectedConversation?.status === 'aguardando_humano' ? '🟠 Aguardando Humano' : '🟢 Atendimento IA'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedConversation?.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs w-[130px] border-none bg-secondary/50 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="aguardando_humano">Triagem</SelectItem>
                    <SelectItem value="resolvida">Resolvida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 bg-secondary/5">
              <div className="space-y-6">
                {loadingConv && (
                  <div className="flex justify-center p-8 animate-spin">
                    <RefreshCcw className="h-8 w-8 text-primary opacity-20" />
                  </div>
                )}
                {selectedConversation?.messages.map((m: any, idx: number) => (
                  <div key={m.id || idx} className={`flex ${m.role === 'system' ? 'justify-center w-full' : m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    {m.role === 'system' ? (
                      <div className="bg-secondary/50 px-3 py-1 rounded-full text-[10px] text-muted-foreground border border-border/40 font-medium">
                        {extractConversationMessageText(m)}
                      </div>
                    ) : (
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md ${
                        m.role === 'user' 
                          ? 'bg-white text-slate-900 rounded-tl-none border border-border/40' 
                          : 'bg-primary text-primary-foreground rounded-tr-none'
                      }`}>
                        {m.metadata?.sourceType && m.metadata.sourceType !== 'text' ? (
                          <MediaMessageBody metadata={m.metadata} />
                        ) : (
                          extractConversationMessageText(m)
                        )}
                        <p className={`text-[9px] mt-1 opacity-50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="p-5 border-t bg-card/50 backdrop-blur-sm">
              <form onSubmit={handleSend} className="flex gap-3 items-end">
                <Textarea 
                  placeholder="Escreva uma mensagem..." 
                  className="min-h-[44px] max-h-32 resize-none bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl" 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  disabled={sending} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20" 
                  disabled={sending || !inputText.trim()}
                >
                  {sending ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </Card>

      {/* Direita: Painel Inteligente (Visível apenas se houver seleção) */}
      {selectedConversation && (
        <Card className="hidden xl:flex w-[320px] flex-col border-none shadow-xl bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div className="text-center space-y-3">
              <Avatar className="h-20 w-20 mx-auto border-4 border-primary/10 shadow-lg">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {selectedConversation.contact_name?.substring(0, 2).toUpperCase() || "SL"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold">{selectedConversation.contact_name || formatPhoneDisplay(selectedPhone!)}</h3>
                <Badge variant="secondary" className="mt-1 bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Plano VIP Platinum</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-amber-500" /> Insights da Julia
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-600">Alta Probabilidade</p>
                  <p className="text-[10px] text-emerald-700/80 leading-relaxed">Cliente tende a agendar nas sextas-feiras à tarde com a profissional Juliana.</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                  <p className="text-[11px] font-bold text-primary">Sugestão Cross-sell</p>
                  <p className="text-[10px] text-primary/80 leading-relaxed">Oferecer Hidratação Premium, último serviço realizado há 45 dias.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Métricas de Valor
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/50 space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase">Receita</p>
                  <p className="text-sm font-bold">R$ 4.280</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase">Score</p>
                  <p className="text-sm font-bold text-emerald-500">98/100</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Últimos Serviços</h4>
              <div className="space-y-2">
                {['Escova Modelada', 'Manicure Express'].map(s => (
                  <div key={s} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/40" /> {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
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