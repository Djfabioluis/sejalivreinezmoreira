import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 font-mono text-slate-300 flex items-center justify-center">
      <Card className="bg-slate-900 border-slate-800 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-400">
            <Activity className="w-6 h-6" />
            Seja Livre AI Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Sistema de Secretaria Virtual IA operacional.</p>
        </CardContent>
      </Card>
    </div>
  );
}
