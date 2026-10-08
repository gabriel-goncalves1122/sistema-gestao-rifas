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

async function peekStatusAgain() {
  const pixSnap = await db.collection('pagamentos_pix').get();
  
  let totalDocs = 0;
  let hasStatus = 0;
  let statusCounts = {};
  
  pixSnap.forEach(doc => {
     totalDocs++;
     const data = doc.data();
     const s = data.status || data.status_pagamento || data.status_pagamento_banco;
     
     if (s) {
       hasStatus++;
       statusCounts[s] = (statusCounts[s] || 0) + 1;
     } else {
       // if no status found, let's see what keys it has
       statusCounts['NO_STATUS'] = (statusCounts['NO_STATUS'] || 0) + 1;
       if (totalDocs === 1) {
         console.log("Sample NO_STATUS doc keys:", Object.keys(data));
       }
     }
  });
  
  console.log("Total:", totalDocs);
  console.log("Has Status:", hasStatus);
  console.log("Status Counts:", statusCounts);
}

peekStatusAgain().then(() => process.exit(0));
