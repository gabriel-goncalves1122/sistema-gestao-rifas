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

async function checkMissingTickets() {
  const pixSnap = await db.collection('pagamentos_pix').get();
  
  let approvedPixIds = [];
  
  pixSnap.forEach(doc => {
    const data = doc.data();
    const s = data.status || data.status_pagamento || data.status_pagamento_banco;
    if (s === 'approved' || s === 'PAID' || s === 'authorized') {
       approvedPixIds.push(doc.id); // doc.id is usually the order id or reference
    }
  });
  
  console.log(`Total approved PIX: ${approvedPixIds.length}`);
  
  let missingPixIds = [];
  
  for (const pixId of approvedPixIds) {
     const pixDoc = await db.collection('pagamentos_pix').doc(pixId).get();
     const pData = pixDoc.data();
     const orderId = pData.pix_order_id || pData.id || pixId;
     
     // See if there are ANY tickets for this order id
     const bilhetesSnap = await db.collection('bilhetes')
       .where('pix_order_id', '==', String(orderId))
       .get();
       
     if (bilhetesSnap.empty) {
        missingPixIds.push({pixId, orderId, reason: "Nenhum bilhete com esse pix_order_id", valor: pData.transaction_amount || pData.valor});
     } else {
        let hasNonDisponivel = false;
        let allDisponivel = true;
        bilhetesSnap.forEach(b => {
           if (b.data().status !== 'disponivel') {
              allDisponivel = false;
           }
        });
        
        if (allDisponivel) {
           missingPixIds.push({pixId, orderId, reason: "Todos os bilhetes estão disponiveis", valor: pData.transaction_amount || pData.valor});
        }
     }
  }
  
  console.log(`Missing PIX from bilhetes: ${missingPixIds.length}`);
  console.log(missingPixIds);
}

checkMissingTickets().then(() => process.exit(0));
