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

async function summaryMissingPix3() {
  const pixIds = [
    'DEAM2TK2BdeR6V8mgRwD',
    'Nibw1pItw1G0ELQh7AH4',
    'SwyvmWiGnVCRy3T9wOGE',
    'gesGYtK7BymEhBaKr5Pq',
    'oCR6gvMMDUPnefqqvPwG'
  ];
  
  let totalVal = 0;
  for (const pid of pixIds) {
     const doc = await db.collection('pagamentos_pix').doc(pid).get();
     const data = doc.data();
     const p = data.pagamento || data;
     const desc = p.description || p.descricao;
     const val = p.transaction_amount || p.valor;
     console.log(`PIX ID: ${pid} - Order: ${data.pix_order_id || p.id} - Valor: ${val} - Desc: ${desc}`);
     if (val) totalVal += parseFloat(val);
  }
  console.log(`Total Value missing: ${totalVal}`);
}

summaryMissingPix3().then(() => process.exit(0));
