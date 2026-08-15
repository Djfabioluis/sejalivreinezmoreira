import { persistWaMessage } from './src/lib/booking/persistence-helper.server';

async function test() {
  const testPhone = 'agente-test:' + Date.now();
  const testMsg = { role: 'system', content: 'test_rpc_fix', timestamp: new Date().toISOString() };
  
  console.log("=== TESTANDO PERSISTÊNCIA RPC ===");
  const res = await persistWaMessage(testPhone, testMsg);
  console.log("Resultado:", JSON.stringify(res, null, 2));
  
  if (res.success) {
    console.log("RPC fix validado com sucesso!");
  } else {
    console.error("RPC fix falhou:", res.error);
    process.exit(1);
  }
}
test();
