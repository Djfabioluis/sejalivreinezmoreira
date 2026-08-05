import { describe, it, expect } from "vitest";

function asArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  // Função segura de desempacotamento recursivo com limite de profundidade
  const keys = ["data", "services", "professionals", "results", "items", "result"];
  
  const findArray = (obj: any, depth = 0): any[] | null => {
    if (depth > 5) return null;
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== "object") return null;
    
    for (const key of keys) {
      if (obj[key]) {
        const found = findArray(obj[key], depth + 1);
        if (found) return found;
      }
    }
    return null;
  };

  return findArray(raw) ?? [];
}

describe("asArray", () => {
  it("array direto", () => {
    expect(asArray([{ id: 1 }])).toEqual([{ id: 1 }]);
  });
  it("objeto com data", () => {
    expect(asArray({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });
  it("objeto aninhado", () => {
    expect(asArray({ data: { professionals: [{ id: 1 }] } })).toEqual([{ id: 1 }]);
  });
  it("objeto aninhado profundo", () => {
    expect(asArray({ result: { data: { professionals: [{ id: 1 }] } } })).toEqual([{ id: 1 }]);
  });
});
