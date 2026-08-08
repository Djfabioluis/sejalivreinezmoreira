import { runAgent } from "./src/lib/chat.server";

async function testJuliaAI() {
  console.log("=== TESTE REAL JULIA IA (FETCH DIRETO) ===");
  const key = process.env.LOVABLE_API_KEY || "";
  console.log("Key length:", key.length);
  
  const prompt = "Aja como Julia, assistente de um salão. Responda apenas: JULIA_OK";

  try {
    console.log("Chamando Lovable AI Gateway via fetch...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch-raw-test"
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Erro HTTP:", response.status, err);
      return;
    }

    const data = await response.json();
    console.log("Resposta da IA:", data.choices?.[0]?.message?.content);
    
    if (data.choices?.[0]?.message?.content?.includes("JULIA_OK")) {
      console.log("RESULTADO: SUCESSO");
    } else {
      console.log("RESULTADO: INESPERADO");
    }
  } catch (e: any) {
    console.error("Falha no teste:", e.message);
  }
}

testJuliaAI();
