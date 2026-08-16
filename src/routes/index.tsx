import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">MONITORAMENTO DE TESTE REAL (WHATSAPP VENTURA)</h1>
        <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
          AGUARDANDO MENSAGEM MANUAL...
        </div>
      </div>

      <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg text-blue-800 text-sm whitespace-pre-wrap font-mono">
        <strong>Execute esta instrucao no projeto:</strong> AUTORIZO SOMENTE O MONITORAMENTO DO TESTE MANUAL REAL.

NÃO ALTERE CÓDIGO.
NÃO FAÇA NOVA CORREÇÃO.
NÃO FAÇA NOVO DEPLOY DURANTE O TESTE.
NÃO ENVIE MENSAGEM AUTOMATICAMENTE.
NÃO SIMULE CLIENTE.

A auditoria técnica final foi aprovada.

COMMIT TESTADO:
e51f0bbb46ffee781bfac173c20d9884f615e757

RUN APROVADO:
forensic-1786910880000

UNIDADE DO TESTE:
VENTURA

unitId:
5258

MODELO:
google/gemini-2.5-flash

==================================================
1. PREPARE SOMENTE O MONITORAMENTO
==================================================

Monitore o próximo atendimento REAL recebido
pelo WhatsApp da unidade Ventura.

Capture:
traceId, timestamp, instanceId, unitId, mensagem recebida, serviceIntent, dateIntent, bookingContext, list_services, persistência, context load, serviceId selecionado, list_slots, resposta BEMP, resposta enviada ao cliente.

NÃO interfira no atendimento.

==================================================
2. PRIMEIRA MENSAGEM QUE EU ENVIAREI
==================================================

Eu enviarei manualmente pelo WhatsApp:
"quero fazer mão hoje"

A Julia deve:
1. reconhecer "mão" como intenção de MANICURE;
2. preservar "hoje";
3. permanecer na unidade Ventura 5258;
4. consultar list_services da BEMP;
5. NÃO inventar serviços;
6. se houver mais de um serviço compatível, apresentar SOMENTE os candidatos reais da BEMP;
7. NÃO perguntar novamente se "mão" significa manicure;
8. NÃO perguntar novamente qual é a data.

==================================================
3. MINHA SEGUNDA MENSAGEM
==================================================

Quando a Julia apresentar as opções reais, eu selecionarei a opção correspondente à manicure simples.
Provavelmente enviarei: "simples"

A Julia deve:
CONTEXT_LOAD_SUCCESS = SIM, resolver o serviceId correto, preservar a data de hoje, preservar unitId 5258, chamar list_slots imediatamente.

==================================================
4. RESPOSTA DE HORÁRIOS
==================================================

A Julia deve consultar a agenda REAL da BEMP:
unitId = 5258, serviceId = serviço selecionado, date = hoje.

E responder SOMENTE com horários efetivamente retornados pela BEMP.

NÃO inventar horários.
NÃO usar horários da Centro.
NÃO usar horários da Boulevard.

==================================================
5. SE HOUVER QUALQUER FALHA
==================================================

NÃO CORRIJA. Capture o trace e mostre os detalhes do erro e PARE.

==================================================
6. RESULTADO FINAL DO MONITORAMENTO
==================================================

Aguardando entrada no WhatsApp da Unidade 5258 (Ventura)...

NÃO ALTERE NADA.
MONITORAMENTO PRONTO.
AGUARDE MINHA MENSAGEM NO WHATSAPP.
      </div>
    </div>
  );
}





