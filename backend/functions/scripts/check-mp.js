const fs = require('fs');
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
});

const axios = require('axios');

async function testar() {
  try {
    const res = await axios.get("https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=5", {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });
    const payments = res.data.results;
    if (payments.length === 0) {
      console.log("Nenhum pagamento encontrado");
      return;
    }
    for (let p of payments) {
      console.log(`Payment ID: ${p.id}, Status: ${p.status}, Notification URL: ${p.notification_url}`);
    }
  } catch (err) {
    console.log("Erro:", err.response ? err.response.data : err.message);
  }
}

testar();
