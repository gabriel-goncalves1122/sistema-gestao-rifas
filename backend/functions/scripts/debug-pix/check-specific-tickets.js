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

async function checkSpecificTickets() {
  const nums = ['00489', '00522', '00549', '00574', '00598'];
  
  for (const n of nums) {
     const doc = await db.collection('bilhetes').doc(n).get();
     console.log(`Bilhete ${n}: `, doc.data());
  }
}

checkSpecificTickets().then(() => process.exit(0));
