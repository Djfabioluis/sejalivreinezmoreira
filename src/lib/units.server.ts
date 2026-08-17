import { getBempConfig, bempFetch } from "./bemp.server";

/** Mapa { unitId: nome } das unidades (salões) da BEMP. */
export async function fetchUnitNameMap(): Promise<Record<string, string>> {
  try {
    const cfg = await getBempConfig();
    const salons = (await bempFetch(`${cfg.apiBase}/salons`)) as any[];

    const map: Record<string, string> = {};
    if (Array.isArray(salons)) {
      salons.forEach((s) => {
        if (s?.id && s?.name) map[String(s.id)] = s.name;
      });
    }
    return map;
  } catch (err) {
    console.error("[fetchUnitNameMap] Failed to fetch salons:", err);
    return {};
  }
}
