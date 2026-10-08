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

async function checkOldest() {
  const pixSnap = await db.collection('pagamentos_pix').limit(20).get();
  
  pixSnap.forEach(doc => {
     console.log(doc.id, doc.data().data_criacao || doc.data().criado_em);
  });
}

checkOldest().then(() => process.exit(0));
