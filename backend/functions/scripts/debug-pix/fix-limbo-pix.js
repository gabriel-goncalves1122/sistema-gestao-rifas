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

async function hardcodeCure() {
  const ticketsToCure = [
    { numero: '08464', order_id: '182698673744', comprador: 'Comprador (PIX Aprovado)' },
    { numero: '08469', order_id: '182698673744', comprador: 'Comprador (PIX Aprovado)' },
    { numero: '08482', order_id: '182698673744', comprador: 'Comprador (PIX Aprovado)' },
    { numero: '08494', order_id: '182698673744', comprador: 'Comprador (PIX Aprovado)' },
    { numero: '08510', order_id: '182698673744', comprador: 'Comprador (PIX Aprovado)' },
    { numero: '02054', order_id: '178574059288', comprador: 'Kilder Ruam Santos Teixeira' },
    { numero: '02053', order_id: '178574059288', comprador: 'Kilder Ruam Santos Teixeira' },
    { numero: '08487', order_id: '182788728532', comprador: 'Higor Martins Noronha' },
    { numero: '00489', order_id: '182267378154', comprador: 'Fernanda Darug Correard' },
    { numero: '00522', order_id: '182267378154', comprador: 'Fernanda Darug Correard' },
    { numero: '00549', order_id: '182267378154', comprador: 'Fernanda Darug Correard' },
    { numero: '00574', order_id: '182267378154', comprador: 'Fernanda Darug Correard' },
    { numero: '00598', order_id: '182267378154', comprador: 'Fernanda Darug Correard' }
  ];
  
  let batch = db.batch();
  let count = 0;
  
  for (const t of ticketsToCure) {
     const tRef = db.collection('bilhetes').doc(t.numero);
     const tDoc = await tRef.get();
     if (tDoc.exists) {
        const tData = tDoc.data();
        if (tData.status === 'disponivel' || tData.status === 'reservado') {
           console.log(`Curing ticket ${t.numero} for PIX ${t.order_id} (comprador: ${t.comprador})`);
           batch.update(tRef, {
              status: 'pago',
              pix_order_id: t.order_id,
              data_pagamento: new Date().toISOString(),
              status_pagamento_banco: 'PAID',
              valor_pago: 10,
              motivo_recusa: admin.firestore.FieldValue.delete(),
              comprador_nome: t.comprador,
              comprador_email: tData.comprador_email || 'email@desconhecido.com'
           });
           count++;
        }
     }
  }
  
  // also for order 178762750186 (duplicate payment by Raissa for 05884)
  // since 05884 is ALREADY paid by another order, we don't need to cure the ticket.
  // but if we want the frontend to show 97, 98... up to 101, it must be linked.
  // actually, if 1 order has NO tickets, it will just not appear in the frontend summary, which is fine because 1 duplicate payment = extra money but no tickets.
  // but if we want the frontend to show R$ 4130,00, we should create a "ghost" ticket or something? No, we shouldn't. The frontend just sums tickets.
  
  if (count > 0) {
     console.log(`Commiting ${count} tickets...`);
     await batch.commit();
     console.log("Cure completed!");
  } else {
     console.log("No tickets to cure.");
  }
}

hardcodeCure().then(() => process.exit(0));
