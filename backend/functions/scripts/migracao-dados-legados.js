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

async function runDataHealing() {
  console.log("=== INICIANDO DATA HEALING (CURA DE DADOS LEGADOS) ===");
  
  const bilhetesSnap = await db.collection('bilhetes').get();
  const batch = db.batch();
  let countFixes = 0;
  
  for (const doc of bilhetesSnap.docs) {
    const data = doc.data();
    const num = doc.id;
    
    // Identificando as 2 categorias
    let isFantasma = false;
    let isLimbo = false;
    
    if (['pago', 'pendente', 'reservado'].includes(data.status)) {
       if (!data.comprador_nome && !data.comprador_id && !data.data_reserva && (data.pix_order_id || data.pix_reference_id)) {
          isFantasma = true;
       }
    }
    
    if (data.status === 'pendente' && data.status_pagamento_banco === 'approved' && data.motivo_recusa && data.motivo_recusa.includes('expirado')) {
       isLimbo = true;
    }
    
    if (isFantasma || isLimbo) {
       let pixId = data.pix_order_id || data.pix_reference_id;
       let pixQuery = await db.collection('pagamentos_pix').where('pix_order_id', '==', pixId).get();
       if (pixQuery.empty) {
         pixQuery = await db.collection('pagamentos_pix').where('reference_id', '==', pixId).get();
       }
       
       if (!pixQuery.empty) {
          const pixData = pixQuery.docs[0].data();
          const updatePayload = {};
          
          if (isFantasma) {
             updatePayload.comprador_id = pixData.comprador_id || null;
             updatePayload.comprador_nome = pixData.comprador_nome || 'Desconhecido (Restaurado)';
             updatePayload.comprador_telefone = pixData.comprador_telefone || '';
             updatePayload.comprador_email = pixData.comprador_email || null;
             updatePayload.data_reserva = pixData.data_criacao || new Date().toISOString();
             console.log(`[Cura - Fantasma] Rifas: ${num} -> Restaurando dados de ${updatePayload.comprador_nome}`);
          }
          
          if (isLimbo) {
             updatePayload.status = 'pago';
             updatePayload.motivo_recusa = admin.firestore.FieldValue.delete();
             updatePayload.comprador_id = pixData.comprador_id || null;
             updatePayload.comprador_nome = pixData.comprador_nome || 'Desconhecido (Restaurado)';
             updatePayload.comprador_telefone = pixData.comprador_telefone || '';
             updatePayload.comprador_email = pixData.comprador_email || null;
             updatePayload.data_reserva = pixData.data_criacao || new Date().toISOString();
             console.log(`[Cura - Limbo] Rifas: ${num} -> Destrancando e Restaurando dados de ${updatePayload.comprador_nome}`);
          }
          
          batch.update(doc.ref, updatePayload);
          countFixes++;
       } else {
          console.log(`[ERRO] Rifa ${num} precisa de cura mas documento PIX não encontrado! (${pixId})`);
       }
    }
  }

  if (countFixes > 0) {
    console.log(`\nEfetuando ${countFixes} correções em batch...`);
    await batch.commit();
    console.log("SUCESSO! Dados curados.");
  } else {
    console.log("\nNenhum dado corrompido encontrado para cura.");
  }
}

runDataHealing().then(() => {
  console.log("\n=== FIM ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
