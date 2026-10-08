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
  const bilhetesSnap = await db.collection("bilhetes").get();
      
  let candidates = [];
  bilhetesSnap.forEach(doc => {
      const data = doc.data();
      let reserva = "";
      if (data.data_reserva) {
          reserva = typeof data.data_reserva.toDate === 'function' 
            ? data.data_reserva.toDate().toISOString() 
            : String(data.data_reserva);
      }
      
      let pagamento = "";
      if (data.data_pagamento) {
          pagamento = typeof data.data_pagamento.toDate === 'function' 
            ? data.data_pagamento.toDate().toISOString() 
            : String(data.data_pagamento);
      }
      
      if (reserva.includes("2026-09-12") || reserva.includes("2026-09-13") || pagamento.includes("2026-09-12") || pagamento.includes("2026-09-13")) {
          candidates.push({ id: doc.id, data: data, reserva, pagamento });
      }
  });
  
  console.log(`Found ${candidates.length} candidate bilhetes reserved/paid around that time`);
  for (let c of candidates) {
      console.log(`Bilhete ${c.id}: ${c.data.comprador_nome} (${c.data.comprador_email}) - Status: ${c.data.status} - Reserva: ${c.reserva} - Pagamento: ${c.pagamento}`);
      console.log(`   Order ID: ${c.data.pix_order_id} | Ref ID: ${c.data.pix_reference_id}`);
  }
}

findOwner().then(() => process.exit(0));
