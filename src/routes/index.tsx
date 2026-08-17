import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
        Seja Livre AI
      </h1>
      <p className="mt-6 text-lg leading-8 text-muted-foreground">
        SaaS Premium para Salões de Beleza e Bem-Estar.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Button asChild size="lg">
          <Link to="/">Entrar no Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
