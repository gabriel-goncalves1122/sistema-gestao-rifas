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

async function checkMissingOrderId() {
  const bilhetesSnap = await db.collection('bilhetes')
    .where('status', 'in', ['pago', 'pendente', 'recusado', 'reservado'])
    .get();
    
  let missingOrderIdCount = 0;
  let missingOrderIdButHasReferenceCount = 0;
  
  bilhetesSnap.forEach(doc => {
    const data = doc.data();
    if (!data.pix_order_id) {
       missingOrderIdCount++;
       if (data.pix_reference_id) {
          missingOrderIdButHasReferenceCount++;
       }
    }
  });
  
  console.log("Bilhetes sem pix_order_id:", missingOrderIdCount);
  console.log("Bilhetes sem pix_order_id MAS com pix_reference_id:", missingOrderIdButHasReferenceCount);
}

checkMissingOrderId().then(() => process.exit(0));
