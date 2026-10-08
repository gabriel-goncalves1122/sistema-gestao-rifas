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

async function peekStatus() {
  const pixSnap = await db.collection('pagamentos_pix').get();
  
  let rootStatus = {};
  let mpStatus = {};
  let withoutPagamento = 0;
  
  pixSnap.forEach(doc => {
     const data = doc.data();
     rootStatus[data.status] = (rootStatus[data.status] || 0) + 1;
     
     if (data.pagamento) {
        mpStatus[data.pagamento.status] = (mpStatus[data.pagamento.status] || 0) + 1;
     } else {
        withoutPagamento++;
     }
  });
  
  console.log("Root status:", rootStatus);
  console.log("MP status:", mpStatus);
  console.log("Without pagamento obj:", withoutPagamento);
}

peekStatus().then(() => process.exit(0));
