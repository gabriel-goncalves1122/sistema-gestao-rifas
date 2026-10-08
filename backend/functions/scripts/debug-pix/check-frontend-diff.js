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

async function checkMissing() {
  const bilhetesSnap = await db.collection("bilhetes").get();
  let dbOrderIds = new Set();
  
  bilhetesSnap.forEach(doc => {
     const data = doc.data();
     if (data.pix_order_id) {
         dbOrderIds.add(String(data.pix_order_id));
     }
  });
  
  const pixSnap = await db.collection("pagamentos_pix").get();
  
  let validPix = 0;
  let missing = [];
  
  pixSnap.forEach(doc => {
     const data = doc.data();
     const s = data.status || data.status_pagamento || data.status_pagamento_banco;
     if (s === 'approved' || s === 'PAID' || s === 'authorized') {
         validPix++;
         const orderId = String(data.pix_order_id || (data.pagamento && data.pagamento.id) || doc.id);
         
         if (!dbOrderIds.has(orderId)) {
             missing.push({
                 id: doc.id,
                 orderId,
                 valor: data.valor || data.transaction_amount || (data.pagamento && data.pagamento.transaction_amount),
                 criadoEm: data.criado_em || data.data_criacao
             });
         }
     }
  });
  
  console.log(`Total Valid Pix: ${validPix}`);
  console.log(`Missing in Bilhetes: ${missing.length}`);
  console.log(missing);
}

checkMissing().then(() => process.exit(0));
