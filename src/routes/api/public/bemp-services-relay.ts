import { createFileRoute } from "@tanstack/react-router";
import { getBempConfig } from "@/lib/bemp.server";

export const Route = createFileRoute("/api/public/bemp-services-relay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const bodyText = await request.text();
          let unitId: string | number | undefined;
          
          try {
            const payload = JSON.parse(bodyText);
            unitId = payload.unitId;
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          if (!unitId) {
            return new Response(JSON.stringify({ error: "unitId is required" }), { 
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const cfg = await getBempConfig();
          const url = `${cfg.apiBase}/salons/${unitId}/services`;
          
          console.log(`[bemp-relay] Fetching services for unit ${unitId} via relay route`);
          
          const res = await fetch(url, {
            method: "GET",
            headers: cfg.headers
          });

          const status = res.status;
          const resText = await res.text();
          
          console.log(`[bemp-relay] BEMP responded: status=${status}, bodyLength=${resText.length}`);

          return new Response(resText, {
            status,
            headers: {
              "Content-Type": "application/json",
              "X-Bemp-Relay": "true",
              "X-Relay-Origin": "TanStack-Server-Route"
            }
          });
        } catch (err: any) {
          console.error(`[bemp-relay] Error: ${err.message}`);
          return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      },
    },
  },
});
