const fs = require('fs');
const envPath = __dirname + '/../.env';
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) {
      process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
admin.initializeApp({ projectId: 'rifasaderidos2026' });
const db = getFirestore();

async function checkMissingPids() {
  const pids = JSON.parse(fs.readFileSync('/home/gabriel/Documentos/UNIFEI/COMISSÃO/sistema-rifas/mp_pids.json', 'utf8'));
  
  const pixSnap = await db.collection('pagamentos_pix').get();
  
  let dbPids = new Set();
  pixSnap.forEach(doc => {
     const data = doc.data();
     const s = data.status || data.status_pagamento || data.status_pagamento_banco;
     if (s === 'approved' || s === 'PAID' || s === 'authorized') {
        const orderId = String(data.pix_order_id || (data.pagamento && data.pagamento.id) || doc.id);
        dbPids.add(orderId);
        // Also add the external_reference or ID directly from doc id just in case
        dbPids.add(String(doc.id));
     }
  });
  
  let missing = [];
  for (const pid of pids) {
     if (!dbPids.has(String(pid))) {
        missing.push(pid);
     }
  }
  
  console.log(`PIDs no CSV do MP: ${pids.length}`);
  console.log(`PIDs (aprovados) no DB: ${dbPids.size} (inclui aliases)`);
  console.log(`Faltando no DB: ${missing.length}`);
  console.log(missing);
}

checkMissingPids().then(() => process.exit(0));
