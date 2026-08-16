import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, ShieldCheck, Database, CheckCircle2 } from "lucide-react";
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const diagnostic = `
Execute esta instrucao no projeto: QUERO CORRIGIR ISSO AGORA COM A MENOR ALTERAÇÃO POSSÍVEL.

PARE A AUDITORIA FORENSE.

PROBLEMA JÁ COMPROVADO:
- BEMP direto retorna serviços;
- unidade 5258 possui catálogo;
- chamada do runtime de produção recebe HTTP 200 com body vazio;
- URL e autenticação estão corretas;
- normalização "mão" -> "manicure" está correta;
- filtros NÃO são a causa.

OBJETIVO:
FAZER A CONSULTA DE SERVIÇOS FUNCIONAR EM PRODUÇÃO
SEM ALTERAR A LÓGICA DE NEGÓCIO.

NÃO ALTERE:
- Julia
- Gemini
- Evolution
- webhook
- bookingContext
- normalização
- matching
- list_slots
- preços
- unitId
- mapeamento das unidades

==================================================
1. CRIE UM FALLBACK DE TRANSPORTE PARA A BEMP
==================================================

Arquivo principal:

src/lib/bemp-service.server.ts

Mantenha a chamada BEMP atual como PRIMARY.

Se acontecer:

HTTP status = 200
E
body realmente vazio

OU

JSON válido mas array final de serviços = []

então execute SOMENTE UMA segunda tentativa por um
runtime/backend alternativo que NÃO utilize o mesmo
egress do Worker atual.

PREFERÊNCIA:

1. Supabase Edge Function já existente/conectada ao projeto;
2. outro backend server-side já existente no projeto e que
   tenha runtime/origem diferente;
3. se não houver runtime alternativo real, NÃO invente um proxy.

NÃO faça chamada BEMP pelo navegador.
NÃO exponha token/API key no frontend.

==================================================
2. SE SUPABASE ESTIVER DISPONÍVEL
==================================================

Crie uma Edge Function mínima chamada:

bemp-services-relay

Entrada:

unitId

Ela deve:

- validar unitId;
- consultar a mesma BEMP usando as credenciais server-side;
- usar o mesmo endpoint já configurado;
- retornar o JSON da BEMP sem modificar os serviços;
- não alterar nomes;
- não filtrar serviços;
- não alterar preços;
- não armazenar credenciais no cliente.

No BempService.listServices:

PRIMARY -> chamada atual

somente se PRIMARY retornar vazio inesperadamente:

FALLBACK -> bemp-services-relay

==================================================
3. PROTEÇÕES
==================================================

Máximo:

PRIMARY_ATTEMPTS = 1
FALLBACK_ATTEMPTS = 1

Sem loop.

Se primary retornar serviços:

NÃO use fallback.

Se fallback retornar serviços:

continue o fluxo normalmente.

Se ambos falharem:

retorne erro diagnosticável;
NÃO transforme silenciosamente em [].

==================================================
4. OBSERVABILIDADE
==================================================

Registre sem dados sensíveis:

BEMP_PRIMARY_STATUS
BEMP_PRIMARY_BODY_LENGTH
BEMP_PRIMARY_COUNT

BEMP_FALLBACK_USED
BEMP_FALLBACK_STATUS
BEMP_FALLBACK_BODY_LENGTH
BEMP_FALLBACK_COUNT

BEMP_FINAL_COUNT

==================================================
5. TESTE
==================================================

NÃO ENVIE WHATSAPP.

Teste somente a função de catálogo para:

unitId = 5258

Mostre:

PRIMARY_COUNT =
FALLBACK_USED =
FALLBACK_COUNT =
FINAL_SERVICE_COUNT =

Depois confirme se existem serviços contendo:

manicure

Mostre:

MANICURE_SERVICE_COUNT =

e liste somente:

serviceId
name
price

==================================================
6. NÃO PUBLIQUE AINDA
==================================================

Execute:

BUILD_PASS =
TYPECHECK_PASS =

Mostre todos os arquivos alterados.

Obrigatório:

BUSINESS_LOGIC_CHANGED = NÃO
BOOKING_LOGIC_CHANGED = NÃO
MATCHING_CHANGED = NÃO
NORMALIZATION_CHANGED = NÃO

==================================================
RESULTADO
==================================================

RUNTIME_ALTERNATIVE_AVAILABLE =
FALLBACK_IMPLEMENTED =
PRIMARY_COUNT =
FALLBACK_COUNT =
FINAL_SERVICE_COUNT =
MANICURE_SERVICE_COUNT =
BUILD_PASS =
TYPECHECK_PASS =
SAFE_TO_DEPLOY =

SE NÃO EXISTIR UM RUNTIME ALTERNATIVO REAL:

FALLBACK_IMPLEMENTED = NÃO
SAFE_TO_DEPLOY = NÃO

e PARE.

NÃO FAÇA DEPLOY AUTOMÁTICO.
`;

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-mono text-slate-300">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-400">
            <Activity className="w-6 h-6" />
            DIAGNÓSTICO E AUTORIZAÇÃO DE PUBLISH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[80vh] w-full rounded-md border border-slate-800 bg-slate-950 p-4">
            <pre className="whitespace-pre-wrap">{diagnostic}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
