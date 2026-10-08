const fs = require('fs');
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
});
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
admin.initializeApp({ projectId: 'rifasaderidos2026' });
const db = getFirestore();

async function checkTickets() {
  const groupA = ['08459', '08475', '08493', '08507', '08512'];
  const groupB = ['08477', '08474', '08407', '08490', '08417'];
  
  const allTickets = [...groupA, ...groupB];
  
  console.log("=== INICIANDO ANALISE DE BILHETES ===");
  
  for (const ticketNum of allTickets) {
    console.log(`\n--- Bilhete: ${ticketNum} ---`);
    const docRef = await db.collection('bilhetes').doc(ticketNum).get();
    
    if (!docRef.exists) {
      console.log(`❌ Bilhete ${ticketNum} NÃO EXISTE no banco de dados!`);
      continue;
    }
    
    const data = docRef.data();
    console.log(`Status: ${data.status}`);
    console.log(`Reservado em: ${data.reservado_em ? data.reservado_em.toDate().toISOString() : 'N/A'}`);
    console.log(`Vendedor ID: ${data.vendedor_id}`);
    console.log(`Comprador ID: ${data.comprador_id}`);
    
    // Check transações vinculadas
    if (data.transacao_pix_id) {
       console.log(`Vinculado ao Pix: ${data.transacao_pix_id}`);
       const pixRef = await db.collection('pagamentos_pix').doc(data.transacao_pix_id).get();
       if (pixRef.exists) {
          console.log(`  -> Status do Pix: ${pixRef.data().status_pagamento_banco}`);
          console.log(`  -> Vendedor ID do Pix: ${pixRef.data().vendedor_id}`);
          console.log(`  -> Comprador ID do Pix: ${pixRef.data().comprador_id}`);
       } else {
          console.log(`  -> ⚠️ Pix ID não encontrado na coleção pagamentos_pix!`);
       }
    }
    
    // Procure em pagamentos_pix por esse numero
    const pixQuery = await db.collection('pagamentos_pix').where('numeros_rifas', 'array-contains', ticketNum).get();
    if (!pixQuery.empty) {
       console.log(`Encontrado em ${pixQuery.size} transação(ões) Pix:`);
       pixQuery.forEach(p => {
          console.log(`  -> ID: ${p.id} | Status: ${p.data().status_pagamento_banco} | Criado: ${p.data().criado_em?.toDate().toISOString()} | Vendedor: ${p.data().vendedor_id}`);
       });
    }

    // Procure em compras_manuais por esse numero
    const manualQuery = await db.collection('compras_manuais').where('numeros_rifas', 'array-contains', ticketNum).get();
    if (!manualQuery.empty) {
       console.log(`Encontrado em ${manualQuery.size} transação(ões) Manuais:`);
       manualQuery.forEach(m => {
          console.log(`  -> ID: ${m.id} | Status: ${m.data().status} | Criado: ${m.data().criado_em?.toDate().toISOString()} | Vendedor: ${m.data().vendedor_id}`);
       });
    }
  }
}

checkTickets().then(() => {
  console.log("\n=== FIM DA ANÁLISE ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
