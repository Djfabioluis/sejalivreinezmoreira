import { BempService } from "./src/lib/bemp-service.server";

async function run() {
  try {
    const salons = await BempService.listSalons();
    console.log("SALONS =", JSON.stringify(salons));
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
}

run();
