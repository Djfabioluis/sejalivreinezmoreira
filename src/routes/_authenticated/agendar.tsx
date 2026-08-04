import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
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
  User, 
  Bot, 
  RefreshCcw, 
  ChevronLeft,
  Filter,
  CheckCircle2,
  Clock,
  UserCog,
  AlertCircle
} from "lucide-react";
import { AiSimulator } from "@/components/ai-simulator";
import { useServerFn } from "@tanstack/react-start";
import { 
  listWAConversations, 
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [instanceFilter, setInstanceFilter] = useState("todos");
  const [agentes, setAgentes] = useState<any[]>([]);

  const fetchConversations = useServerFn(listWAConversations);
  const fetchAgentes = useServerFn(listAgentes);
  const fnMarkAsRead = useServerFn(markAsRead);
  const fnUpdateStatus = useServerFn(updateConversationStatus);
  const fnSendMessage = useServerFn(sendManualWAMessage);

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(() => 
    conversations.find(c => c.phone === selectedPhone),
  [conversations, selectedPhone]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [convs, agsResult] = await Promise.all([
        fetchConversations({ 
          data: {
            search, 
            status: statusFilter, 
            instance: instanceFilter === "todos" ? undefined : instanceFilter 
          }
        }),
        fetchAgentes()
      ]);
      setConversations(convs);
      setAgentes(agsResult.items);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar conversas");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    
    const channel = supabase
      .channel("wa_conversas_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversas" }, () => {
        loadData(true);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [search, statusFilter, instanceFilter]);

  useEffect(() => {
    if (selectedPhone) {
      const conv = conversations.find(c => c.phone === selectedPhone);
      if (conv && conv.unread_count > 0) {
        fnMarkAsRead({ data: { phone: selectedPhone } }).catch(console.error);
      }
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedPhone, selectedConversation?.messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedPhone || !inputText.trim() || sending) return;

    setSending(true);
    try {
      await fnSendMessage({ data: { phone: selectedPhone, text: inputText } });
      setInputText("");
      await loadData(true);
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
      await loadData(true);
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const parts = phone.split(":");
    const num = parts[parts.length - 1];
    if (num.length === 13 && num.startsWith("55")) {
      return `+55 (${num.slice(2,4)}) ${num.slice(4,9)}-${num.slice(9)}`;
    }
    return `+${num}`;
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl h-[calc(100vh-100px)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Secretária Virtual</h1>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => loadData()}>
             <RefreshCcw className="h-4 w-4 mr-2" />
             Atualizar
           </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="inbox">Caixa de entrada</TabsTrigger>
          <TabsTrigger value="simulator">Simulador da IA</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="flex-1 flex gap-4 overflow-hidden mt-4">
          {/* Coluna Esquerda: Lista */}
          <Card className={`w-full md:w-1/3 flex flex-col overflow-hidden ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b space-y-3 bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar contato ou número..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="aberta">Abertas</SelectItem>
                    <SelectItem value="aguardando_humano">Triagem Humana</SelectItem>
                    <SelectItem value="resolvida">Resolvidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <UserCog className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Instância" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas instâncias</SelectItem>
                    {agentes.map(a => (
                      <SelectItem key={a.instancia} value={a.instancia}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y">
                {loading && (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                )}
                {!loading && conversations.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma conversa encontrada
                  </div>
                )}
                {conversations.map((conv) => (
                  <div 
                    key={conv.phone}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedPhone === conv.phone ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                    onClick={() => setSelectedPhone(conv.phone)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm truncate max-w-[150px]">
                        {conv.contact_name || formatPhoneDisplay(conv.phone)}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {extractConversationMessageText(conv.messages[conv.messages.length - 1])}
                        </p>
                        <div className="flex gap-1 items-center">
                           <Badge variant="outline" className="text-[9px] py-0 h-4 bg-background">
                             {conv.instance?.split('-')[1] || conv.instance}
                           </Badge>
                           <StatusBadge status={conv.status} />
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="rounded-full h-5 min-w-[20px] px-1.5 text-[10px]">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Coluna Direita: Conversa */}
          <Card className={`flex-1 flex flex-col overflow-hidden ${!selectedPhone ? 'hidden md:flex items-center justify-center bg-muted/10' : 'flex'}`}>
            {!selectedPhone ? (
              <div className="text-center space-y-2 opacity-60">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <p>Selecione uma conversa para começar</p>
              </div>
            ) : (
              <>
                {/* Header Conversa */}
                <div className="p-3 border-b flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedPhone(null)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="rounded-full bg-primary/10 p-2">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold leading-none">
                        {selectedConversation?.contact_name || formatPhoneDisplay(selectedPhone)}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {selectedConversation?.instance} · {formatPhoneDisplay(selectedPhone)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedConversation?.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-8 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                        <SelectItem value="aguardando_humano">Triagem Humana</SelectItem>
                        <SelectItem value="resolvida">Resolvida</SelectItem>
                        <SelectItem value="arquivada">Arquivada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Histórico */}
                <ScrollArea className="flex-1 p-4 bg-muted/5">
                  <div ref={scrollRef} className="space-y-4">
                    {selectedConversation?.messages.map((m: any, idx: number) => (
                      <div 
                        key={m.id || idx} 
                        className={`flex gap-2 ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        {m.role === 'user' && (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div className={`max-w-[75%] space-y-1 ${m.role === 'user' ? 'items-start' : 'items-end'} flex flex-col`}>
                           <div className={`px-4 py-2 rounded-2xl text-sm break-words ${
                             m.role === 'user' 
                               ? 'bg-card border rounded-tl-none' 
                               : m.role === 'assistant' 
                                 ? 'bg-primary text-primary-foreground rounded-tr-none'
                                 : 'bg-violet-600 text-white rounded-tr-none'
                           }`}>
                             {extractConversationMessageText(m)}
                           </div>
                           <span className="text-[9px] text-muted-foreground opacity-70">
                             {m.role === 'user' ? 'Cliente' : m.role === 'assistant' ? 'IA' : 'Operador'}
                           </span>
                        </div>
                        {m.role !== 'user' && (
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-violet-600 text-white'}`}>
                            {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input Envio */}
                <div className="p-4 border-t bg-card">
                  <form onSubmit={handleSend} className="flex gap-2 items-end max-w-4xl mx-auto">
                    <Textarea 
                      placeholder="Responda manualmente..." 
                      className="min-h-[44px] max-h-32 resize-none"
                      rows={1}
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
                    <Button type="submit" size="icon" disabled={sending || !inputText.trim()}>
                      {sending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Sua resposta será enviada via WhatsApp pela Evolution API.
                  </p>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="flex-1 mt-4">
           <AiSimulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "aberta":
      return <Badge variant="secondary" className="text-[8px] py-0 h-3 bg-blue-100 text-blue-700 hover:bg-blue-100">Aberta</Badge>;
    case "aguardando_humano":
      return <Badge variant="secondary" className="text-[8px] py-0 h-3 bg-orange-100 text-orange-700 hover:bg-orange-100">Triagem</Badge>;
    case "resolvida":
      return <Badge variant="secondary" className="text-[8px] py-0 h-3 bg-green-100 text-green-700 hover:bg-green-100">Resolvida</Badge>;
    default:
      return <Badge variant="outline" className="text-[8px] py-0 h-3">{status}</Badge>;
  }
}
