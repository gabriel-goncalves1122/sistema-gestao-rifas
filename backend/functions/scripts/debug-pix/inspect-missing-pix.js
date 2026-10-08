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

async function inspectMissingPix() {
  const pixIds = [
    'DEAM2TK2BdeR6V8mgRwD',
    'Nibw1pItw1G0ELQh7AH4',
    'SwyvmWiGnVCRy3T9wOGE',
    'gesGYtK7BymEhBaKr5Pq',
    'oCR6gvMMDUPnefqqvPwG'
  ];
  
  for (const pid of pixIds) {
     const doc = await db.collection('pagamentos_pix').doc(pid).get();
     console.log(`\n\n--- PIX DOC: ${pid} ---`);
     console.log(JSON.stringify(doc.data(), null, 2));
  }
}

inspectMissingPix().then(() => process.exit(0));
