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

async function inspectPayment() {
  const pixDoc = await db.collection("pagamentos_pix").doc("SwyvmWiGnVCRy3T9wOGE").get();
  console.log("PIX:", JSON.stringify(pixDoc.data(), null, 2));
  
  const bilhetesSnap = await db.collection("bilhetes").where("pix_order_id", "==", "178762750186").get();
  console.log("Bilhetes with exact order ID:", bilhetesSnap.size);
  
  const allSnap = await db.collection("bilhetes").get();
  let matches = [];
  allSnap.forEach(doc => {
     const data = doc.data();
     if (JSON.stringify(data).includes("178762750186")) {
         matches.push(doc.id);
     }
  });
  console.log("Bilhetes with string anywhere:", matches);
}

inspectPayment().then(() => process.exit(0));
