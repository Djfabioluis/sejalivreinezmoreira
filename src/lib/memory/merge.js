import { FIELD_COLUMN, LIST_FIELDS, MAX_LIST_ITEMS, MAX_SUMMARY_LENGTH, MAX_TEXT_LENGTH, OBJECT_FIELDS, SCALAR_FIELDS, SOURCE_WEIGHT, } from "./types";
function clampText(value, max = MAX_TEXT_LENGTH) {
    return value.trim().slice(0, max);
}
function sameNormalized(a, b) {
    return a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
}
function toStringList(value) {
    if (Array.isArray(value)) {
        return value.filter((v) => typeof v === "string" || typeof v === "number").map((v) => clampText(String(v)));
    }
    if (typeof value === "string" || typeof value === "number") {
        const text = clampText(String(value));
        return text ? [text] : [];
    }
    return [];
}
function dedupe(list) {
    const out = [];
    for (const item of list) {
        if (!item)
            continue;
        if (!out.some((existing) => sameNormalized(existing, item)))
            out.push(item);
    }
    return out.slice(0, MAX_LIST_ITEMS);
}
function isScalarField(field) {
    return SCALAR_FIELDS.includes(field);
}
function isListField(field) {
    return LIST_FIELDS.includes(field);
}
function isObjectField(field) {
    return OBJECT_FIELDS.includes(field);
}
/**
 * Decide se um novo fato pode sobrescrever o valor atual do campo.
 * Regra: dado confirmado nunca é substituído por dado de menor confiança.
 */
export function canOverride(current, incomingSource, incomingConfidence) {
    if (!current)
        return true;
    const currentWeight = SOURCE_WEIGHT[current.source] ?? 0;
    const incomingWeight = SOURCE_WEIGHT[incomingSource] ?? 0;
    if (incomingWeight > currentWeight)
        return true;
    if (incomingWeight < currentWeight)
        return false;
    return incomingConfidence >= (current.confidence ?? 0);
}
/**
 * Merge seguro entre a memória existente e o que foi extraído da conversa.
 * - preserva dados antigos válidos;
 * - nunca transforma valor ausente em null;
 * - dedupe em listas e limite de tamanho;
 * - registra origem, confiança e data por campo.
 */
export function mergeCustomerMemory(existingMemory, extracted, options = {}) {
    const now = options.now ?? new Date().toISOString();
    const existing = existingMemory ?? {};
    const fieldSources = {
        ...(existing.field_sources ?? {}),
    };
    const patch = {};
    const changes = [];
    const readCurrent = (field) => {
        const column = FIELD_COLUMN[field];
        if (column in patch)
            return patch[column];
        return existing[column];
    };
    // 1. Correções explícitas do cliente ("não quero mais X").
    for (const correction of extracted.corrections ?? []) {
        const field = correction.field;
        if (!isListField(field))
            continue;
        const current = toStringList(readCurrent(field));
        const next = current.filter((item) => !sameNormalized(item, correction.removeValue));
        if (next.length !== current.length) {
            patch[FIELD_COLUMN[field]] = next;
            fieldSources[field] = { source: "explicit_customer_statement", confidence: 0.95, updated_at: now };
            changes.push({
                field,
                before: current,
                after: next,
                source: "explicit_customer_statement",
                confidence: 0.95,
            });
        }
    }
    // 2. Fatos extraídos.
    for (const fact of extracted.facts ?? []) {
        const field = fact.field;
        const currentSource = fieldSources[field];
        if (isScalarField(field)) {
            const value = typeof fact.value === "string" || typeof fact.value === "number" ? clampText(String(fact.value)) : "";
            if (!value)
                continue; // nunca transformar ausência em null
            if (!canOverride(currentSource, fact.source, fact.confidence))
                continue;
            const before = readCurrent(field);
            if (typeof before === "string" && sameNormalized(before, value)) {
                fieldSources[field] = { source: fact.source, confidence: fact.confidence, updated_at: now };
                continue;
            }
            patch[FIELD_COLUMN[field]] = value;
            fieldSources[field] = { source: fact.source, confidence: fact.confidence, updated_at: now };
            changes.push({ field, before: before ?? null, after: value, source: fact.source, confidence: fact.confidence });
            continue;
        }
        if (isListField(field)) {
            const incoming = toStringList(fact.value);
            if (incoming.length === 0)
                continue;
            const current = toStringList(readCurrent(field));
            let next;
            if (fact.operation === "remove") {
                next = current.filter((item) => !incoming.some((rem) => sameNormalized(item, rem)));
            }
            else if (fact.operation === "set") {
                if (!canOverride(currentSource, fact.source, fact.confidence))
                    continue;
                next = dedupe(incoming);
            }
            else {
                next = dedupe([...incoming, ...current]);
            }
            if (JSON.stringify(next) === JSON.stringify(current))
                continue;
            patch[FIELD_COLUMN[field]] = next;
            fieldSources[field] = { source: fact.source, confidence: fact.confidence, updated_at: now };
            changes.push({ field, before: current, after: next, source: fact.source, confidence: fact.confidence });
            continue;
        }
        if (isObjectField(field)) {
            if (typeof fact.value !== "object" || fact.value === null || Array.isArray(fact.value))
                continue;
            if (!canOverride(currentSource, fact.source, fact.confidence))
                continue;
            const current = readCurrent(field) ?? {};
            const next = { ...current, ...fact.value };
            if (JSON.stringify(next) === JSON.stringify(current))
                continue;
            patch[FIELD_COLUMN[field]] = next;
            fieldSources[field] = { source: fact.source, confidence: fact.confidence, updated_at: now };
            changes.push({ field, before: current, after: next, source: fact.source, confidence: fact.confidence });
        }
    }
    // 3. Pendências da conversa.
    if (extracted.pendingTopics && extracted.pendingTopics.length > 0) {
        const current = toStringList(readCurrent("pendingTopics"));
        const next = dedupe([...toStringList(extracted.pendingTopics), ...current]);
        if (JSON.stringify(next) !== JSON.stringify(current)) {
            patch[FIELD_COLUMN.pendingTopics] = next;
            changes.push({ field: "pendingTopics", before: current, after: next, source: "inferred", confidence: 0.4 });
        }
    }
    // 4. Resumo da memória.
    const summary = (extracted.suggestedSummary ?? "").trim();
    if (summary && summary !== (existing.memory_summary ?? "")) {
        patch["memory_summary"] = summary.slice(0, MAX_SUMMARY_LENGTH);
        changes.push({
            field: "memory_summary",
            before: existing.memory_summary ?? null,
            after: patch["memory_summary"],
            source: "inferred",
            confidence: 0.5,
        });
    }
    if (changes.length > 0) {
        patch["field_sources"] = fieldSources;
        patch["memory_version"] = (existing.memory_version ?? 1) + 1;
        patch["confidence_score"] = computeConfidenceScore(fieldSources);
    }
    patch["last_interaction_at"] = now;
    return { patch, changes, fieldSources };
}
/** Confiança média da memória (0..1), ponderada pela origem de cada campo. */
export function computeConfidenceScore(fieldSources) {
    const entries = Object.values(fieldSources);
    if (entries.length === 0)
        return 0;
    const total = entries.reduce((acc, entry) => {
        const weight = (SOURCE_WEIGHT[entry.source] ?? 0) / 100;
        return acc + weight * (entry.confidence ?? 0);
    }, 0);
    return Number((total / entries.length).toFixed(3));
}
