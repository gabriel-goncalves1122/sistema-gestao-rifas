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

async function peekPix() {
  const pixSnap = await db.collection('pagamentos_pix').limit(2).get();
  pixSnap.forEach(doc => {
     console.log(JSON.stringify(doc.data(), null, 2));
  });
}

peekPix().then(() => process.exit(0));
