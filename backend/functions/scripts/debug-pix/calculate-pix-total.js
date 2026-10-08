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

async function calculateTotalPix() {
  console.log("=== INICIANDO CALCULO DE TOTAL PIX ===");
  
  const pixSnap = await db.collection('pagamentos_pix').get();
  
  let totalBruto = 0;
  let totalLiquidoMP = 0;
  let countApproved = 0;
  let countTotal = 0;
  
  pixSnap.forEach(doc => {
    const data = doc.data();
    countTotal++;
    
    const s = data.status || data.status_pagamento || data.status_pagamento_banco;
    const isApproved = s === 'approved' || s === 'PAID' || s === 'authorized';
    
    if (isApproved) {
       countApproved++;
       
       let valorBruto = data.transaction_amount || data.valor || data.valor_bruto || 0;
       if (typeof valorBruto === 'string') valorBruto = parseFloat(valorBruto);
       
       totalBruto += valorBruto;
       
       if (data.transaction_details && data.transaction_details.net_received_amount) {
          totalLiquidoMP += data.transaction_details.net_received_amount;
       } else if (data.fee_details && data.fee_details.length > 0) {
          let fee = data.fee_details.reduce((acc, f) => acc + (f.amount || 0), 0);
          totalLiquidoMP += (valorBruto - fee);
       } else {
          totalLiquidoMP += (valorBruto * 0.99);
       }
    }
  });

  const descontoEstimado = totalBruto - totalLiquidoMP;

  console.log(`Total de registros PIX gerados: ${countTotal}`);
  console.log(`Total de registros PIX APROVADOS (Pagos): ${countApproved}`);
  console.log(`-----------------------------------`);
  console.log(`Valor BRUTO recebido (antes das taxas): R$ ${totalBruto.toFixed(2)}`);
  console.log(`Desconto do Mercado Pago (aprox. 1%): R$ ${descontoEstimado.toFixed(2)}`);
  console.log(`Valor LÍQUIDO final (disponível na conta): R$ ${totalLiquidoMP.toFixed(2)}`);
}

calculateTotalPix().then(() => {
  console.log("\n=== FIM ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
