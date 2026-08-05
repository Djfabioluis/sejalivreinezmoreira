import { Mic, Image as ImageIcon, Video, FileText, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export type MediaMetadata = {
  sourceType?: "audio" | "image" | "video" | "document" | "text";
  mediaStatus?: "queued" | "processing" | "analyzed" | "failed" | "rejected";
  mimeType?: string | null;
  fileName?: string | null;
  duration?: number | null;
  caption?: string | null;
  transcription?: string | null;
  visualDescription?: string | null;
};

const ICONS = {
  audio: Mic,
  image: ImageIcon,
  video: Video,
  document: FileText,
} as const;

const LABELS = {
  audio: "Áudio recebido",
  image: "Imagem recebida",
  video: "Vídeo recebido",
  document: "Documento recebido",
} as const;

const STATUS_LABEL: Record<string, string> = {
  queued: "na fila",
  processing: "processando",
  analyzed: "analisado",
  failed: "falhou",
  rejected: "não suportado",
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MediaMessageBody({ metadata }: { metadata: MediaMetadata }) {
  const type = metadata.sourceType;
  if (!type || type === "text") return null;

  const Icon = ICONS[type];
  const status = metadata.mediaStatus ?? "queued";
  const duration = formatDuration(metadata.duration);

  const StatusIcon =
    status === "analyzed" ? CheckCircle2 : status === "failed" || status === "rejected" ? AlertTriangle : Loader2;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        <Icon className="h-3.5 w-3.5" />
        <span>{LABELS[type]}</span>
        {duration && <span className="opacity-70">· {duration}</span>}
        <span className="flex items-center gap-1 opacity-70">
          <StatusIcon className={`h-3 w-3 ${status === "processing" || status === "queued" ? "animate-spin" : ""}`} />
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      {metadata.fileName && (
        <div className="text-[11px] opacity-70 truncate">{metadata.fileName}</div>
      )}

      {metadata.caption && <div className="text-sm italic opacity-90">“{metadata.caption}”</div>}

      {metadata.transcription && (
        <div className="text-sm">
          <span className="opacity-60 text-[11px] block">Transcrição</span>
          {metadata.transcription}
        </div>
      )}

      {metadata.visualDescription && (
        <div className="text-sm">
          <span className="opacity-60 text-[11px] block">Descrição</span>
          {metadata.visualDescription}
        </div>
      )}
    </div>
  );
}
