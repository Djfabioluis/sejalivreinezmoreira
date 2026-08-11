import { mergeBookingContext, extractBookingSlots, BookingContext } from "./src/lib/booking/context";

async function testPersistenceLogic() {
  console.log("--- TESTE DE LÓGICA DE PERSISTÊNCIA (R2) ---");

  // Turno 1: "Oi"
  let ctx: BookingContext = {};
  let ext1 = extractBookingSlots("Oi");
  ctx = mergeBookingContext(ctx, ext1);
  console.log("Turno 1 (Oi):", JSON.stringify(ctx));

  // Turno 2: "Manicure"
  let ext2 = extractBookingSlots("Manicure");
  console.log("Extracted T2:", JSON.stringify(ext2));
  ctx = mergeBookingContext(ctx, ext2);
  console.log("Turno 2 (Manicure):", JSON.stringify(ctx));

  // Turno 3: "11/08"
  let ext3 = extractBookingSlots("11/08");
  console.log("Extracted T3:", JSON.stringify(ext3));
  ctx = mergeBookingContext(ctx, ext3);
  console.log("Turno 3 (11/08):", JSON.stringify(ctx));

  const success = ctx.date === "2026-08-11" && (ctx.serviceName === "MANICURE");
  
  if (success) {
    console.log("✅ SUCESSO: Lógica de merge preservou os campos.");
  } else {
    console.log("❌ FALHA: Campos foram perdidos.");
    console.log("Contexto final:", JSON.stringify(ctx, null, 2));
  }
}

testPersistenceLogic();
