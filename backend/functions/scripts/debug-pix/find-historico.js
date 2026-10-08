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

async function findInHistorico() {
  const bilhetesSnap = await db.collection("bilhetes").get();
      
  let candidates = [];
  bilhetesSnap.forEach(doc => {
      const data = doc.data();
      const hist = data.historico || [];
      
      let found = false;
      for (let h of hist) {
         let time = "";
         if (h.data) {
             time = typeof h.data.toDate === 'function' ? h.data.toDate().toISOString() : String(h.data);
         }
         
         // 2026-09-13T01:3...Z is 21:3... in GMT-4
         if (time.includes("2026-09-13T01:3") || time.includes("2026-09-13T01:4") || time.includes("2026-09-12T21:3") || time.includes("2026-09-12T21:4")) {
             found = true;
         }
      }
      
      if (found) {
         candidates.push({ id: doc.id, data: data });
      }
  });
  
  console.log(`Found ${candidates.length} candidates by historico`);
  for (let c of candidates) {
      console.log(`Bilhete ${c.id}: current status = ${c.data.status}`);
      console.log(JSON.stringify(c.data.historico, null, 2));
  }
}

findInHistorico().then(() => process.exit(0));
