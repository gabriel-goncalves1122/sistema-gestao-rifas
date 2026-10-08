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

async function getMissingTicketsRegex() {
  const pixIds = [
    'DEAM2TK2BdeR6V8mgRwD',
    'Nibw1pItw1G0ELQh7AH4',
    'SwyvmWiGnVCRy3T9wOGE',
    'gesGYtK7BymEhBaKr5Pq',
    'oCR6gvMMDUPnefqqvPwG'
  ];
  
  let allLimboTickets = [];
  
  for (const pid of pixIds) {
     const doc = await db.collection('pagamentos_pix').doc(pid).get();
     const data = doc.data();
     const strData = JSON.stringify(data);
     
     const matches = strData.match(/\d{5}/g);
     const uniqueMatches = [...new Set(matches || [])].filter(m => parseInt(m) <= 10000); // Only likely ticket numbers
     
     console.log(`PIX ID: ${pid} - Encontrados possiveis bilhetes: ${uniqueMatches.join(', ')}`);
     
     for (const m of uniqueMatches) {
        const tdoc = await db.collection('bilhetes').doc(m).get();
        if (tdoc.exists) {
           const tdata = tdoc.data();
           console.log(`   Bilhete ${m}: status=${tdata.status}, pix_order_id=${tdata.pix_order_id}, comprador=${tdata.comprador_nome || tdata.vendedor_nome}`);
           
           if (tdata.status === 'disponivel') {
             allLimboTickets.push({ numero: m, pix_id: pid, order_id: data.pix_order_id || (data.pagamento && data.pagamento.id) });
           }
        }
     }
  }
  
  console.log("\n--- TICKETS EM LIMBO PARA CURA ---");
  console.log(allLimboTickets);
  fs.writeFileSync('tickets_em_limbo.json', JSON.stringify(allLimboTickets, null, 2));
}

getMissingTicketsRegex().then(() => process.exit(0));
