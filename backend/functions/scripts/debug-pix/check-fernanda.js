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

async function checkFernanda() {
  console.log("=== INICIANDO ANALISE DE FERNANDA DARUG ===");
  
  // Buscar bilhetes com vendedor_nome contendo 'FERNANDA'
  const bilhetesSnap = await db.collection('bilhetes').get();
  
  let totalFernanda = 0;
  let statusContagem = {};
  
  for (const doc of bilhetesSnap.docs) {
    const data = doc.data();
    if (data.vendedor_nome && data.vendedor_nome.toUpperCase().includes('FERNANDA')) {
      totalFernanda++;
      statusContagem[data.status] = (statusContagem[data.status] || 0) + 1;
      
      if (['pendente', 'reservado', 'pago'].includes(data.status)) {
        // Vamos checar minuciosamente se há algo faltando
        let falhas = [];
        if (!data.comprador_id) falhas.push("Sem comprador_id");
        if (!data.data_reserva) falhas.push("Sem data_reserva");
        if (!data.pix_order_id && !data.pix_reference_id) falhas.push("Sem ID de Pix");
        
        if (falhas.length > 0) {
           console.log(`\nBilhete ${doc.id} (${data.status}) - FALHAS: ${falhas.join(', ')}`);
           console.log(JSON.stringify(data, null, 2));
        }
      }
    }
  }
  
  console.log(`\nTotal de bilhetes para Fernanda: ${totalFernanda}`);
  console.log("Status count:", statusContagem);
}

checkFernanda().then(() => {
  console.log("\n=== FIM DA ANÁLISE ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
