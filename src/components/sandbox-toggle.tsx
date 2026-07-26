import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { getSandbox, setSandbox, subscribeSandbox } from "@/lib/sandbox";

export function SandboxToggle({ compact = false }: { compact?: boolean }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getSandbox());
    return subscribeSandbox(setOn);
  }, []);

  function handleChange(next: boolean) {
    setSandbox(next);
    setOn(next);
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        on ? "border-amber-500/60 bg-amber-500/10" : "bg-card"
      }`}
      title="No modo sandbox, agendamentos não são gravados na Bemp."
    >
      <FlaskConical className={`h-4 w-4 ${on ? "text-amber-600" : "text-muted-foreground"}`} />
      {!compact && <span className="font-medium">Sandbox</span>}
      <Switch checked={on} onCheckedChange={handleChange} aria-label="Alternar modo sandbox" />
      {on && (
        <Badge variant="outline" className="border-amber-500/60 text-amber-700">
          simulação
        </Badge>
      )}
    </div>
  );
}

export function SandboxBanner() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(getSandbox());
    return subscribeSandbox(setOn);
  }, []);
  if (!on) return null;
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 text-amber-800 text-xs px-4 py-1.5 text-center flex items-center justify-center gap-2">
      <FlaskConical className="h-3.5 w-3.5" />
      Modo sandbox ativo — nenhum agendamento será gravado na Bemp.
    </div>
  );
}
