const fs = require('fs');
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
});
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp({ projectId: 'rifasaderidos2026' });

async function run() {
  try {
    console.log("1. Pegando o primeiro admin...");
    const userDocs = await admin.firestore().collection("usuarios").where("role", "==", "admin").limit(1).get();
    if (userDocs.empty) {
      console.log("Nenhum admin encontrado.");
      return;
    }
    const adminUser = userDocs.docs[0];
    const uid = adminUser.id;
    console.log(`Admin encontrado: ${adminUser.data().email} (UID: ${uid})`);

    console.log("2. Pegando o ultimo pagamento pix do banco...");
    const pixDocs = await admin.firestore().collection("pagamentos_pix").orderBy("data_criacao", "desc").limit(1).get();
    if (pixDocs.empty) {
      console.log("Nenhum pagamento pix.");
      return;
    }
    const pixId = pixDocs.docs[0].id;
    console.log(`Pagamento PIX alvo: ${pixId}`);

    console.log("3. Minting custom token...");
    // A role is stored in custom claims, but let's assume the user already has them.
    const customToken = await admin.auth().createCustomToken(uid);

    console.log("4. Exchange for ID token...");
    const API_KEY = "AIzaSyCqwdm2hzUmrsHLjg-P12d5jqzPNjgi9y8";
    const res = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
      token: customToken,
      returnSecureToken: true
    });
    const idToken = res.data.idToken;

    console.log("5. Testando leitura via REST API...");
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/rifasaderidos2026/databases/(default)/documents/pagamentos_pix/${pixId}`;
    
    try {
      const readRes = await axios.get(firestoreUrl, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      console.log("SUCESSO! O Firestore retornou os dados!");
      console.log("Status recebido:", readRes.data.fields.status_pagamento_banco.stringValue);
    } catch (err) {
      console.error("ERRO AO LER FIRESTORE!");
      if (err.response) {
        console.error(err.response.status, err.response.data);
      } else {
        console.error(err.message);
      }
    }
  } catch (error) {
    console.error("Erro geral:", error);
  }
}
run();
