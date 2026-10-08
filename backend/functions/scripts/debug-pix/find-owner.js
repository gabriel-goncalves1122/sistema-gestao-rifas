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

async function findOwner() {
  const pixDoc = await db.collection("pagamentos_pix").doc("SwyvmWiGnVCRy3T9wOGE").get();
  const pixData = pixDoc.data();
  console.log("PIX Payer:", JSON.stringify(pixData.payer, null, 2));
  console.log("PIX Bank Info:", JSON.stringify(pixData.pagamento?.point_of_interaction?.transaction_data?.bank_info || pixData.bank_info || pixData.pagamento?.bank_info, null, 2));
  
  // Also, sometimes people upload comprovante
  const bilhetesSnap = await db.collection("bilhetes")
      .where("status", "in", ["reservado", "pendente", "disponivel", "recusado"])
      .get();
      
  let candidates = [];
  bilhetesSnap.forEach(doc => {
      const data = doc.data();
      if (data.data_reserva && data.data_reserva.includes("2026-09-12")) {
          candidates.push({ id: doc.id, data: data });
      }
      if (data.data_reserva && data.data_reserva.includes("2026-09-13")) {
          candidates.push({ id: doc.id, data: data });
      }
  });
  
  console.log(`Found ${candidates.length} candidate bilhetes reserved around that time`);
  for (let c of candidates) {
      console.log(`Bilhete ${c.id}: ${c.data.comprador_nome} (${c.data.comprador_email}) - Status: ${c.data.status} - Reserva: ${c.data.data_reserva}`);
  }

}

findOwner().then(() => process.exit(0));
