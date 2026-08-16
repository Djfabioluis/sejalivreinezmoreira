import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-red-600">URGENTE: O TESTE MANUAL REAL NO WHATSAPP FALHOU</h1>
        <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
          IA NÃO RESPONDEU AO "QUERO FAZER MÃO HOJE"
        </div>
      </div>

      <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-800 text-sm whitespace-pre-wrap font-mono">
        <strong>RELATÓRIO DE FALHA CRÍTICA (TESTE REAL VENTURA)</strong>
        {"\n"}==================================================
        {"\n"}EVIDÊNCIA: O cliente enviou a mensagem e a Julia permaneceu em silêncio.
        {"\n"}==================================================
        {"\n"}
        {"\n"}<strong>AUDITORIA FORENSE DO TRACE:</strong>
        {"\n"}1. WEBHOOK_RECEIPT: NÃO DETECTADO NOS LOGS DO SERVIDOR (17:35 - 17:42).
        {"\n"}2. AUTHENTICATION: Nenhuma tentativa de POST registrada no endpoint /api/public/whatsapp-evolution.
        {"\n"}3. INSTANCE_ISOLATION: Sem logs de entrada para a instância da Ventura (agente-554130731358).
        {"\n"}
        {"\n"}<strong>CAUSA RAIZ PROVÁVEL:</strong>
        {"\n"}A Evolution API não está entregando os webhooks para este ambiente ou a URL do webhook está incorreta/inacessível.
        {"\n"}
        {"\n"}<strong>AÇÕES IMEDIATAS:</strong>
        {"\n"}1. Verificar se a instância na Evolution API está configurada com a URL correta:
        {"\n"}   https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
        {"\n"}2. Verificar se o Webhook Secret na Evolution coincide com a VITE_SUPABASE_URL (ou env configurada).
        {"\n"}3. Validar se a instância está "CONNECTED" na Evolution.
        {"\n"}
        {"\n"}<strong>STATUS DO AMBIENTE:</strong>
        {"\n"}COMMIT: e51f0bbb46ffee781bfac173c20d9884f615e757
        {"\n"}BUILD: PASS
        {"\n"}TYPECHECK: PASS
        {"\n"}
        {"\n"}<strong>PARE E AGUARDE MINHA AUTORIZAÇÃO PARA QUALQUER CORREÇÃO.</strong>
      </div>
    </div>
  );
}






