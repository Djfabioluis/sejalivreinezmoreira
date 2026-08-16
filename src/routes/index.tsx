import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900 whitespace-pre-wrap">
Execute esta instrucao no projeto: PARE. NÃO PUBLIQUE AINDA.

A auditoria confirmou:

EXACT_404_CAUSE =
o domínio principal sejalivreinezmoreira.lovable.app
não está servindo o estado atual publicado do projeto.

O endpoint funciona no ambiente de deploy,
mas o domínio principal retorna 404.

Portanto a correção necessária parece ser PUBLICAÇÃO/ROTEAMENTO,
não alteração da lógica do webhook.

PORÉM:

CURRENT_HEAD =
b69053f5a3679b5b6fd387d086686b3e9dcf9f1f

WORKTREE_DIRTY = SIM

Também houve:

REMOVED_TEST_FILE =
src/lib/booking/tests/infra_audit.ts

NÃO FAÇA PUBLISH COM WORKTREE DIRTY.

==================================================
1. AUDITE O WORKTREE COMPLETO
==================================================

Mostre TODOS os arquivos:

MODIFIED =
ADDED =
DELETED =
UNTRACKED =

Para cada arquivo:

arquivo | status | motivo | classificação

Classifique como:

RUNTIME
UI
ROUTING
OBSERVABILITY
TEST
GENERATED
TEMPORARY

==================================================
2. PROTEJA A LÓGICA APROVADA
==================================================

Confirme:

JULIA_LOGIC_CHANGED = NÃO
GEMINI_CHANGED = NÃO
BEMP_CHANGED = NÃO
BOOKING_LOGIC_CHANGED = NÃO
PERSISTENCE_CHANGED = NÃO
UNIT_MAPPING_CHANGED = NÃO
WEBHOOK_HANDLER_CHANGED = NÃO
PARSER_CHANGED = NÃO
EVOLUTION_CONFIG_CHANGED = NÃO

Se qualquer item for SIM:

PARE.

==================================================
3. AUDITE O ARQUIVO REMOVIDO
==================================================

Para:

src/lib/booking/tests/infra_audit.ts

mostre:

FILE_EXISTED_IN_LAST_APPROVED_COMMIT =
FILE_IS_TEST_ONLY =
IMPORTED_BY_RUNTIME =
REMOVAL_REQUIRED_FOR_BUILD =
REMOVAL_AFFECTS_PRODUCTION =

Obrigatório:

REMOVAL_AFFECTS_PRODUCTION = NÃO

==================================================
4. ARQUIVOS GERADOS/TEMPORÁRIOS
==================================================

Liste os arquivos .js gerados e scripts temporários
que estão deixando o worktree dirty.

Para cada um mostre:

TRACKED_BY_GIT =
REQUIRED_FOR_BUILD =
REQUIRED_IN_PRODUCTION =

Se forem apenas artefatos temporários ou gerados,
remova SOMENTE esses arquivos.

NÃO remova arquivos runtime.

==================================================
5. CRIE UMA VERSÃO LIMPA
==================================================

Depois da auditoria:

WORKTREE_DIRTY_AFTER_CLEANUP =

Obrigatório:

WORKTREE_DIRTY_AFTER_CLEANUP = NÃO

Mostre:

CLEAN_COMMIT =
FILES_IN_CLEAN_COMMIT =

Não faça alterações adicionais de lógica.

==================================================
6. BUILD DA VERSÃO EXATA
==================================================

No CLEAN_COMMIT execute:

BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =

Se qualquer um for NÃO:

PARE.

==================================================
7. PROVE QUE O HANDLER CONTINUA PRESENTE
==================================================

No CLEAN_COMMIT:

ROUTE_FILE_EXISTS =
src/routes/api/public/whatsapp-evolution.ts

WEBHOOK_HANDLER_PRESENT =
OBSERVABILITY_PRESENT =

E confirme:

BUSINESS_LOGIC_CHANGED_SINCE_APPROVED_VERSION = NÃO

==================================================
8. PREPARAÇÃO PARA PUBLICAÇÃO
==================================================

Se tudo acima passar, mostre:

DEPLOY_TARGET_COMMIT =
WORKTREE_CLEAN =
BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =
SAFE_TO_PUBLISH_PRIMARY_DOMAIN =

Obrigatório:

DEPLOY_TARGET_COMMIT = CLEAN_COMMIT
WORKTREE_CLEAN = SIM
SAFE_TO_PUBLISH_PRIMARY_DOMAIN = SIM

==================================================
9. NÃO PUBLIQUE AINDA
==================================================

Mesmo se estiver tudo aprovado:

NÃO clique Publish.
NÃO faça deploy.
NÃO altere domínio.
NÃO altere Evolution.

PARE E AGUARDE MINHA AUTORIZAÇÃO.

==================================================
RESULTADO FINAL
==================================================

CURRENT_HEAD =
WORKTREE_DIRTY_BEFORE =
FILES_CHANGED =
REMOVED_TEST_FILE_SAFE =
RUNTIME_FILES_CHANGED =
BUSINESS_LOGIC_CHANGED =
WORKTREE_DIRTY_AFTER_CLEANUP =
CLEAN_COMMIT =
BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =
WEBHOOK_HANDLER_PRESENT =
DEPLOY_TARGET_COMMIT =
SAFE_TO_PUBLISH_PRIMARY_DOMAIN =
    </div>
  );
}

