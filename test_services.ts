import { list_services } from './src/lib/booking/bemp/services/list_services.functions';

async function test() {
  try {
    const result = await list_services({ unitId: '5258', query: 'manicure' });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
