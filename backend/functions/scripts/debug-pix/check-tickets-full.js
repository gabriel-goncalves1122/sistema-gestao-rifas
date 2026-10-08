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
  
  console.log("=== INICIANDO ANALISE COMPLETA DE BILHETES ===");
  
  for (const ticketNum of allTickets) {
    console.log(`\n--- Bilhete: ${ticketNum} ---`);
    const docRef = await db.collection('bilhetes').doc(ticketNum).get();
    
    if (!docRef.exists) {
      console.log(`❌ Bilhete ${ticketNum} NÃO EXISTE no banco de dados!`);
      continue;
    }
    
    const data = docRef.data();
    console.log(JSON.stringify(data, null, 2));
    
    // Procure em pagamentos_pix por esse numero
    const pixQuery = await db.collection('pagamentos_pix').where('numeros_rifas', 'array-contains', ticketNum).get();
    if (!pixQuery.empty) {
       console.log(`Encontrado em ${pixQuery.size} transação(ões) Pix:`);
       pixQuery.forEach(p => {
          console.log(`  -> ID: ${p.id}`);
          console.log(JSON.stringify(p.data(), null, 2));
       });
    }

    // Procure em compras_manuais por esse numero
    const manualQuery = await db.collection('compras_manuais').where('numeros_rifas', 'array-contains', ticketNum).get();
    if (!manualQuery.empty) {
       console.log(`Encontrado em ${manualQuery.size} transação(ões) Manuais:`);
       manualQuery.forEach(m => {
          console.log(`  -> ID: ${m.id}`);
          console.log(JSON.stringify(m.data(), null, 2));
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
