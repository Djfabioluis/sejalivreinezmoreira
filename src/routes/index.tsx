import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Status do Teste: Enviado</h1>
      <div className="bg-muted p-6 rounded-lg border border-border max-w-2xl w-full text-left font-mono text-sm overflow-auto">
        <p className="text-green-500 font-bold mb-2">✓ Mensagem manual enviada pelo usuário registrada no webhook.</p>
        <p className="text-yellow-500 mb-2">! Observação: O evento foi registrado como 'message_ignored_from_me'.</p>
        <p className="text-blue-500 mb-2">ℹ Causa: O código estava dando 'continue' antes de processar o takeover.</p>
        <p className="mt-4 text-foreground/70 border-t pt-4">
          Acesse a aba <strong>Caixa de Entrada</strong> ou <strong>CRM</strong> para verificar a transição para o modo <strong>HUMANO</strong>.
        </p>
      </div>
      <div className="text-muted-foreground text-sm italic">
        Execute esta instrucao no projeto: enviado
      </div>
    </div>
  ),
})
