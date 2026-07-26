import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSalons from "./tools/list-salons";
import listServices from "./tools/list-services";
import listProfessionals from "./tools/list-professionals";
import listSlots from "./tools/list-slots";
import listCustomerAppointments from "./tools/list-customer-appointments";
import createAppointment from "./tools/create-appointment";

// Direct Supabase issuer (proxied .lovable.cloud host is rejected by mcp-js).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bemp-secretaria-mcp",
  title: "Secretária Virtual Bemp",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar unidades, serviços, profissionais, horários e criar agendamentos na conta Bemp do usuário. Sempre use list_services antes de create_appointment para conferir preço e duração; calcule 'end' somando a duração ao 'start'. Confirme com o usuário antes de criar agendamento.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSalons,
    listServices,
    listProfessionals,
    listSlots,
    listCustomerAppointments,
    createAppointment,
  ],
});
