// Grava áudio do microfone e faz upload para /api/transcribe.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  disabled?: boolean;
  onTranscript: (text: string) => void | Promise<void>;
};

export function MicRecorder({ disabled, onTranscript }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (disabled || state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // MIME candidate list: Chrome/Firefox = webm, Safari = mp4.
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
      ];
      const mime =
        candidates.find((m) =>
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
        ) ?? "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        if (blob.size < 1024) {
          setState("idle");
          toast.error("Gravação muito curta, tente novamente.");
          return;
        }
        setState("processing");
        try {
          const ext =
            type.includes("mp4") ? "mp4" :
            type.includes("mpeg") ? "mp3" :
            type.includes("ogg") ? "ogg" :
            type.includes("wav") ? "wav" : "webm";
          const form = new FormData();
          form.append("audio", blob, `mic.${ext}`);
          const { data: sess } = await supabase.auth.getSession();
          const token = sess.session?.access_token;
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error ?? `HTTP ${res.status}`);
          }
          const { text } = (await res.json()) as { text?: string };
          const clean = (text ?? "").trim();
          if (!clean) {
            toast.error("Não consegui entender o áudio. Fale mais próximo do microfone.");
          } else {
            await onTranscript(clean);
          }
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Falha ao transcrever.");
        } finally {
          setState("idle");
        }
      };
      rec.start();
      setState("recording");
      const started = Date.now();
      tickRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - started) / 1000);
        setElapsed(secs);
        if (secs >= 60) rec.state === "recording" && rec.stop();
      }, 250);
    } catch (err) {
      console.error(err);
      cleanup();
      toast.error("Permita o acesso ao microfone para gravar.");
    }
  }, [disabled, state, cleanup, onTranscript]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  if (state === "processing") {
    return (
      <Button type="button" size="icon" variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (state === "recording") {
    return (
      <Button
        type="button"
        size="icon"
        variant="destructive"
        onClick={stop}
        title={`Gravando ${elapsed}s — clique para enviar`}
      >
        <Square className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={start}
      disabled={disabled}
      title="Gravar áudio"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
