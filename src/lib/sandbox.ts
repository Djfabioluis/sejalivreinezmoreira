// Client-safe helpers for the sandbox toggle. Persisted in localStorage.
const KEY = "bemp-sandbox-mode";

export function getSandbox(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setSandbox(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, on ? "1" : "0");
  window.dispatchEvent(new CustomEvent("sandbox-change", { detail: on }));
}

export function subscribeSandbox(cb: (on: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener("sandbox-change", handler);
  return () => window.removeEventListener("sandbox-change", handler);
}
