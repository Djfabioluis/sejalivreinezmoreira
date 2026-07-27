import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  bempFetch,
  getBempConfig,
  BEMP_WEBHOOK_BASE,
  PROFESSIONAL_PREFERENCE_NOTE,
  tryUpdateBempScheduleNote,
  withProfessionalPreferenceNote,
  type JsonValue,
} from "./bemp.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./permissions.functions";

export const listSalons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, "bemp");
    const cfg = await getBempConfig();
    return (await bempFetch(`${cfg.apiBase}/salons`)) as JsonValue;
  });

export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ salonId: z.union([z.string(), z.number()]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
    const cfg = await getBempConfig();
    return (await bempFetch(`${cfg.apiBase}/salons/${data.salonId}/services`)) as JsonValue;
  });

export const listProfessionals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        salonId: z.union([z.string(), z.number()]),
        serviceId: z.union([z.string(), z.number()]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
    const cfg = await getBempConfig();
    return (await bempFetch(
      `${cfg.apiBase}/salons/${data.salonId}/services/${data.serviceId}/professionals`,
    )) as JsonValue;
  });

export const listSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
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
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
    const cfg = await getBempConfig();
    const url = data.professionalId
      ? `${cfg.apiBase}/salons/${data.salonId}/services/${data.serviceId}/professionals/${data.professionalId}/slots/${data.date}`
      : `${cfg.apiBase}/salons/${data.salonId}/services/${data.serviceId}/slots/${data.date}`;
    return (await bempFetch(url)) as JsonValue;
  });

export const listCustomerAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        phoneCountry: z.string().min(1),
        phoneArea: z.string().min(1),
        phoneNumber: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
    const qs = new URLSearchParams({
      phone_country_code: data.phoneCountry,
      phone_area_code: data.phoneArea,
      phone_number: data.phoneNumber,
    });
    return (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`)) as JsonValue;
  });

export const getCustomer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        phoneCountry: z.string().min(1),
        phoneArea: z.string().min(1),
        phoneNumber: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
    const qs = new URLSearchParams({
      phone_country_code: data.phoneCountry,
      phone_area_code: data.phoneArea,
      phone_number: data.phoneNumber,
    });
    return (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`)) as JsonValue;
  });

export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
    const payload = withProfessionalPreferenceNote(data);
    const result = (await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    })) as JsonValue;
    if (data.professional_id != null) {
      await tryUpdateBempScheduleNote(result, PROFESSIONAL_PREFERENCE_NOTE);
    }
    return result;
  });

export const cancelAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .handler(async ({ data, context }) => {
    await assertPermission(context, "bemp");
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
