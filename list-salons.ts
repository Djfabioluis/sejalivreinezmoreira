import { BempService } from './src/lib/bemp-service.server';

async function main() {
  try {
    const salons = await BempService.listSalons();
    console.log(JSON.stringify(salons, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
