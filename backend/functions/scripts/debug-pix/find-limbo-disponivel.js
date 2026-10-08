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

async function findLimboDisponivelTickets() {
  const pixSnap = await db.collection('pagamentos_pix').get();
  
  let approvedPixs = [];
  
  pixSnap.forEach(doc => {
    const data = doc.data();
    const p = data.pagamento || data;
    const s = data.status || data.status_pagamento || data.status_pagamento_banco;
    if (s === 'approved' || s === 'PAID' || s === 'authorized') {
       approvedPixs.push({
          id: doc.id,
          orderId: data.pix_order_id || p.id,
          desc: p.description || p.descricao,
          payerEmail: p.payer?.email || 'Desconhecido',
          payerName: p.payer?.first_name ? `${p.payer.first_name} ${p.payer.last_name}` : 'Desconhecido',
          data: data
       });
    }
  });
  
  console.log(`Verificando ${approvedPixs.length} Pix aprovados...`);
  
  let limboTickets = [];
  
  for (const pix of approvedPixs) {
     if (!pix.desc) continue;
     
     // extract "00489", "00522", etc
     const matches = pix.desc.match(/\d{5}/g);
     if (!matches || matches.length === 0) continue;
     
     let allDisponivel = true;
     let anyDisponivel = false;
     let ticketsData = [];
     
     for (const num of matches) {
        const tDoc = await db.collection('bilhetes').doc(num).get();
        if (tDoc.exists) {
           const tData = tDoc.data();
           ticketsData.push({ numero: num, status: tData.status, order_id: tData.pix_order_id });
           if (tData.status === 'disponivel') {
              anyDisponivel = true;
           } else {
              allDisponivel = false;
           }
        }
     }
     
     if (anyDisponivel) {
        limboTickets.push({
           pixId: pix.id,
           orderId: pix.orderId,
           desc: pix.desc,
           tickets: ticketsData
        });
     }
  }
  
  console.log(`\n\nENCONTRADOS ${limboTickets.length} PIX COM BILHETES EM LIMBO (DISPONIVEL):`);
  console.log(JSON.stringify(limboTickets, null, 2));
}

findLimboDisponivelTickets().then(() => process.exit(0));
