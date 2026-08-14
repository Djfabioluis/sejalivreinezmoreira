import { useEffect, useRef, useState } from "react";
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
  ChevronRight,
  User,
  Bot,
  ArrowDown
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function InboxPanel() {
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
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const selectedPhoneRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useServerFn(listWAConversations);
  const fetchOneConversation = useServerFn(getWAConversation);
  const fetchAgentes = useServerFn(listAgentes);
  const fnMarkAsRead = useServerFn(markAsRead);
  const fnUpdateStatus = useServerFn(updateConversationStatus);
  const fnSendMessage = useServerFn(sendManualWAMessage);

  useEffect(() => { selectedPhoneRef.current = selectedPhone; }, [selectedPhone]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadList = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetchConversations({ 
        data: {
          search: debouncedSearch, 
          status: statusFilter, 
          instance: instanceFilter === "todos" ? undefined : instanceFilter,
          page,
          pageSize: 20
        }
      });
      setConversations(result.conversations);
      setTotal(result.total);
      
      const ags = await fetchAgentes();
      setAgentes(ags.items);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar conversas");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadConversation = async (phone: string, silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const conv = await fetchOneConversation({ data: { phone } });
      if (conv) {
        setSelectedConversation(conv);
        if (conv.unread_count > 0) {
          setConversations(prev => prev.map(c => c.phone === phone ? { ...c, unread_count: 0 } : c));
          fnMarkAsRead({ data: { phone } }).catch(console.error);
        }
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
      .channel("wa-conversas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversas" }, (payload) => {
        const updated = (payload.new || payload.old) as any;
        if (!updated?.phone) return;

        setConversations(prev => {
          const idx = prev.findIndex(c => c.phone === updated.phone);
          let newList = [...prev];
          if (idx > -1) {
            newList[idx] = { ...newList[idx], ...updated };
          } else if (page === 0) {
            newList = [updated, ...prev];
          }
          return newList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        });

        if (selectedPhoneRef.current === updated.phone) {
          loadConversation(updated.phone, true);
        }
      })
      .subscribe((status) => setRealtimeStatus(status));
    return () => { supabase.removeChannel(channel); };
  }, [page]);

  useEffect(() => {
    if (isAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (selectedConversation?.messages?.length) {
      // Se não está no fundo e chegou mensagem nova, mostra o botão
      setShowScrollBottom(true);
    }
  }, [selectedConversation?.messages?.length]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    setShowScrollBottom(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const atBottom = scrollBottom < 100;
    setIsAtBottom(atBottom);
    if (atBottom) setShowScrollBottom(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedPhone || !inputText.trim() || sending) return;
    setSending(true);
    try {
      await fnSendMessage({ data: { phone: selectedPhone, text: inputText } });
      setInputText("");
      await loadConversation(selectedPhone, true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
    } finally {
      setSending(false);
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] min-h-0 gap-4 bg-background border rounded-xl overflow-hidden">
      {/* Lista */}
      <div className={`w-full lg:w-[350px] flex flex-col border-r bg-muted/10 ${selectedPhone ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Conversas
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {realtimeStatus === 'SUBSCRIBED' ? 'Ao vivo' : 'Conectando...'}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              className="pl-8 h-9 text-sm" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-[10px] flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="aguardando_humano">Triagem</SelectItem>
                <SelectItem value="resolvida">Resolvidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={instanceFilter} onValueChange={setInstanceFilter}>
              <SelectTrigger className="h-8 text-[10px] flex-1">
                <SelectValue placeholder="Instância" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {agentes.map(a => <SelectItem key={a.instancia} value={a.instancia}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {conversations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conversa encontrada.</div>
              )}
              {conversations.map(conv => (
                <div 
                  key={conv.phone} 
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedPhone === conv.phone ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                  onClick={() => setSelectedPhone(conv.phone)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm truncate max-w-[150px]">
                      {conv.contact_name || formatPhoneDisplay(conv.phone)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {conv.instance?.split('-').pop()}
                    </span>
                    {conv.unread_count > 0 && (
                      <Badge className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px]">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                     <StatusBadge status={conv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {total > 20 && (
          <div className="p-2 border-t flex justify-between items-center bg-muted/20">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] text-muted-foreground">Pág. {page + 1}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${!selectedPhone ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
        {!selectedPhone ? (
          <div className="text-center space-y-3 opacity-30">
            <MessageSquare className="h-12 w-12 mx-auto" />
            <p className="text-sm font-medium">Selecione uma conversa para atender</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSelectedPhone(null)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h3 className="text-sm font-bold leading-none">
                    {selectedConversation?.contact_name || formatPhoneDisplay(selectedPhone)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Instância: {selectedConversation?.instance}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedConversation?.status} 
                  onValueChange={(val) => {
                    fnUpdateStatus({ data: { phone: selectedPhone, status: val } });
                    setSelectedConversation(prev => prev ? { ...prev, status: val } : null);
                  }}
                >
                  <SelectTrigger className="h-8 text-[10px] w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="aguardando_humano">Triagem</SelectItem>
                    <SelectItem value="resolvida">Resolvida</SelectItem>
                    <SelectItem value="arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-muted/5 min-h-0">
              <div className="max-w-3xl mx-auto space-y-4">
                {loadingConv && <div className="text-center py-4"><RefreshCcw className="h-5 w-5 animate-spin mx-auto opacity-20" /></div>}
                {selectedConversation?.messages.map((m: any, i: number) => {
                  const isAssistant = m.role === 'assistant' || m.role === 'operator';
                  const isSystem = m.role === 'system';
                  if (isSystem) return (
                    <div key={i} className="flex justify-center py-2">
                      <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground border">
                        {extractConversationMessageText(m)}
                      </span>
                    </div>
                  );
                  return (
                    <div key={i} className={`flex gap-2 ${isAssistant ? 'justify-end' : 'justify-start'}`}>
                      {!isAssistant && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`max-w-[85%] lg:max-w-[70%] ${isAssistant ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`rounded-2xl px-4 py-2 text-sm ${
                          isAssistant 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-card border rounded-tl-none'
                        }`}>
                          {extractConversationMessageText(m)}
                        </div>
                        {m.createdAt && (
                          <span className="text-[9px] text-muted-foreground opacity-70">
                             {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {isAssistant && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {showScrollBottom && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg rounded-full animate-bounce gap-2"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="h-3 w-3" />
                  Nova mensagem
                </Button>
              )}
            </div>

            <div className="p-4 border-t bg-card">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2 items-end">
                <Textarea 
                  placeholder="Responder cliente..." 
                  className="min-h-[44px] max-h-32 resize-none text-sm" 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <Button size="icon" className="h-11 w-11 shrink-0" disabled={sending || !inputText.trim()}>
                  {sending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string, color: string }> = {
    aberta: { label: "Aberta", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    aguardando_humano: { label: "Triagem", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    resolvida: { label: "Resolvida", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    arquivada: { label: "Arquivada", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  };
  const item = config[status] || { label: status, color: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 rounded-md font-medium border ${item.color}`}>{item.label}</Badge>;
}