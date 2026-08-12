import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiSimulator } from "@/components/ai-simulator";
import { InboxPanel } from "@/components/inbox-panel";

export const Route = createFileRoute("/_authenticated/agendar")({
  head: () => ({
    title: "Central de Atendimento WhatsApp — Julia",
    meta: [{ name: "description", content: "Gerencie conversas do WhatsApp em tempo real." }]
  }),
  component: AgendarPage,
});

function AgendarPage() {
  return (
    <div className="container mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="inbox">Caixa de entrada</TabsTrigger>
          <TabsTrigger value="simulator">Simulador da IA</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-0">
          <InboxPanel />
        </TabsContent>
        <TabsContent value="simulator" className="mt-0">
          <AiSimulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}