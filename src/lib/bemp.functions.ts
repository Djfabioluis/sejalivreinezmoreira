import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BEMP_WEBHOOK_BASE = "https://webhooks.bemp.app/webhooks";

function getConfig() {
  const dominio = process.env.BEMP_DOMINIO;
  const token = process.env.BEMP_TOKEN;
  if (!dominio || !token) {
    throw new Error("BEMP_DOMINIO/BEMP_TOKEN não configurados no servidor");
  }
  return {
    dominio,
    token,
    apiBase: `https://${dominio}.bemp.app/api`,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    } as Record<string, string>,
  };
}

async function bempFetch(url: string, init?: RequestInit) {
  const cfg = getConfig();
  const res = await fetch(url, {
    ...init,
    headers: { ...cfg.headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // manter texto cru
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : typeof body === "string" && body.length > 0
          ? body
          : `Bemp respondeu ${res.status}`;
    throw new Error(`Bemp ${res.status}: ${msg}`);
  }
  return body;
}

// ---------- Salões / Unidades ----------
export const listSalons = createServerFn({ method: "GET" }).handler(async () => {
  const cfg = getConfig();
  const data = await bempFetch(`${cfg.apiBase}/salons`);
  return data as JsonValue;
});

// ---------- Serviços por unidade ----------
export const listServices = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ salonId: z.union([z.string(), z.number()]) }).parse(input))
  .handler(async ({ data }) => {
    const cfg = getConfig();
    return (await bempFetch(`${cfg.apiBase}/salons/${data.salonId}/services`)) as JsonValue;
  });

// ---------- Profissionais por serviço ----------
export const listProfessionals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        salonId: z.union([z.string(), z.number()]),
        serviceId: z.union([z.string(), z.number()]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = getConfig();
    return (await bempFetch(
      `${cfg.apiBase}/salons/${data.salonId}/services/${data.serviceId}/professionals`,
    )) as JsonValue;
  });

// ---------- Slots disponíveis ----------
export const listSlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        salonId: z.union([z.string(), z.number()]),
        serviceId: z.union([z.string(), z.number()]),
        professionalId: z.union([z.string(), z.number()]).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato YYYY-MM-DD"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = getConfig();
    const url = data.professionalId
      ? `${cfg.apiBase}/salons/${data.salonId}/services/${data.serviceId}/professionals/${data.professionalId}/slots/${data.date}`
      : `${cfg.apiBase}/salons/${data.salonId}/services/${data.serviceId}/slots/${data.date}`;
    return (await bempFetch(url)) as JsonValue;
  });

// ---------- Consulta agendamentos de um cliente ----------
export const listCustomerAppointments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        phoneCountry: z.string().min(1),
        phoneArea: z.string().min(1),
        phoneNumber: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const qs = new URLSearchParams({
      phone_country_code: data.phoneCountry,
      phone_area_code: data.phoneArea,
      phone_number: data.phoneNumber,
    });
    return (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`)) as JsonValue;
  });

// ---------- Consulta cliente ----------
export const getCustomer = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        phoneCountry: z.string().min(1),
        phoneArea: z.string().min(1),
        phoneNumber: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const qs = new URLSearchParams({
      phone_country_code: data.phoneCountry,
      phone_area_code: data.phoneArea,
      phone_number: data.phoneNumber,
    });
    return (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`)) as JsonValue;
  });

// ---------- Criar agendamento ----------
export const createAppointment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        salon_id: z.number(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        start: z.string(),
        end: z.string(),
        name: z.string().min(1),
        phone_country_code: z.string().min(1),
        phone_area_code: z.string().min(1),
        phone_number: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
      method: "POST",
      body: JSON.stringify(data),
    })) as JsonValue;
  });

// ---------- Cancelar agendamento ----------
export const cancelAppointment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        appointmentId: z.union([z.string(), z.number()]),
        phoneCountry: z.string().min(1),
        phoneArea: z.string().min(1),
        phoneNumber: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const qs = new URLSearchParams({
      phone_country_code: data.phoneCountry,
      phone_area_code: data.phoneArea,
      phone_number: data.phoneNumber,
      id: String(data.appointmentId),
    });
    return (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`, {
      method: "DELETE",
    })) as JsonValue;
  });
