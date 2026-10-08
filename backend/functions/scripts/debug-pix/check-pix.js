const fs = require('fs');
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
});
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
admin.initializeApp({ projectId: 'rifasaderidos2026' });
const db = getFirestore();

async function run() {
  const q = await db.collection("pagamentos_pix").orderBy("data_criacao", "desc").limit(3).get();
  q.forEach(doc => {
    console.log("ID:", doc.id);
    console.log("Vendedor ID:", doc.data().vendedor_id);
    console.log("Role (if any):", doc.data().role || 'No role field');
  });
}
run();
