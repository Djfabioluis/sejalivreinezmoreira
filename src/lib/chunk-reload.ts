// Após um novo deploy, os arquivos JS antigos deixam de existir e o navegador
// falha ao carregar um chunk ("Failed to fetch dynamically imported module"),
// resultando em tela branca. Aqui recarregamos a página uma única vez para
// buscar a versão nova dos assets.

const GUARD_KEY = "chunk-reload:last";

function isChunkLoadError(message: string) {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

export function reloadOnChunkError(reason: unknown): boolean {
  if (typeof window === "undefined") return false;
  const message =
    reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
  if (!message || !isChunkLoadError(message)) return false;

  try {
    const last = Number(sessionStorage.getItem(GUARD_KEY) ?? 0);
    // evita loop infinito de reloads
    if (Date.now() - last < 15_000) return false;
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  } catch {
    /* sessionStorage indisponível: segue com o reload */
  }

  window.location.reload();
  return true;
}

export function installChunkReloadHandler(): () => void {
  if (typeof window === "undefined") return () => {};

  const onPreloadError = (event: Event) => {
    reloadOnChunkError((event as CustomEvent<{ payload?: unknown }>).detail ?? event);
  };
  const onError = (event: ErrorEvent) => {
    reloadOnChunkError(event.error ?? event.message);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reloadOnChunkError(event.reason);
  };

  window.addEventListener("vite:preloadError", onPreloadError);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("vite:preloadError", onPreloadError);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
