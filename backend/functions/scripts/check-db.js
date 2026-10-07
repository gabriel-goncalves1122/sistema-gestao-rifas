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
  const q = await db.collection("pagamentos_pix").where("pix_order_id", "==", "177105190364").get();
  if (q.empty) {
    console.log("NOT FOUND in DB!");
  } else {
    q.forEach(doc => {
      console.log("DB Status:", doc.data().status_pagamento_banco);
      console.log("Notification URL in raw:", doc.data().raw_mercadopago?.notification_url);
    });
  }
}
run();
