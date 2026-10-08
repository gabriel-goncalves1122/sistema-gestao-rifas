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

async function deepCompare() {
  console.log("=== INICIANDO ANALISE ESTRUTURAL PROFUNDA DOS BILHETES ===");
  
  const bilhetesSnap = await db.collection('bilhetes').get();
  
  // Pegando um caso que sabemos que deu certo como base (ex: 08400 - Higor Martins Noronha)
  const perfectDoc = bilhetesSnap.docs.find(d => d.id === '08400');
  const perfectData = perfectDoc ? perfectDoc.data() : null;
  
  if (!perfectData) {
     console.log("Não foi possível encontrar o bilhete base (08400).");
     process.exit(1);
  }
  
  const expectedKeys = Object.keys(perfectData).sort();
  console.log("Modelo Base de Chaves (Bilhete Perfeito PIX):", expectedKeys.join(', '));
  
  let anomalies = {};
  
  for (const doc of bilhetesSnap.docs) {
    const data = doc.data();
    const num = doc.id;
    
    // Pula os disponíveis
    if (data.status === 'disponivel') continue;
    
    // Ignora bilhetes que foram comprados por upload manual (comprovante_url)
    if (data.comprovante_url) continue;
    
    let isPix = data.pix_order_id || data.pix_reference_id;
    if (!isPix) continue; // Pula transações completamente desconhecidas ou que não são pix
    
    let docKeys = Object.keys(data).sort();
    
    let falhas = [];
    
    // 1. Verificar campos essenciais ausentes
    const essenciais = ['comprador_nome', 'comprador_id', 'data_reserva', 'valor_pago', 'data_pagamento', 'status_pagamento_banco', 'vendedor_id', 'status'];
    essenciais.forEach(key => {
      if (data[key] === undefined || data[key] === null) {
        // Se for data_pagamento nula, mas o status não for pago, é compreensível.
        if (key === 'data_pagamento' && data.status !== 'pago') return;
        if (key === 'valor_pago' && data.status !== 'pago') return;
        if (key === 'status_pagamento_banco' && data.status !== 'pago') return;
        
        falhas.push(`Falta campo essencial: ${key}`);
      }
    });
    
    // 2. Verificar anomalias de tipagem
    if (data.valor_pago && typeof data.valor_pago !== 'number') falhas.push(`valor_pago não é número (${typeof data.valor_pago})`);
    if (data.valor_bruto && typeof data.valor_bruto !== 'number') falhas.push(`valor_bruto não é número (${typeof data.valor_bruto})`);
    
    // 3. Inconsistência Lógica
    // Se o bilhete está como "pago", mas o banco não aprovou
    if (data.status === 'pago' && data.status_pagamento_banco !== 'approved') {
       // Permite se foi validado manualmente (status_validacao === 'aceita') e tem observação ou não é Pix
       if (data.status_validacao !== 'aceita') {
         falhas.push(`Bilhete pago mas status do banco é ${data.status_pagamento_banco}`);
       }
    }
    
    // Se o bilhete tem data de reserva muito fora do padrão (ex: string não ISO)
    if (data.data_reserva) {
       let d = new Date(data.data_reserva);
       if (isNaN(d.getTime())) {
          falhas.push(`data_reserva inválida: ${data.data_reserva}`);
       }
    }

    if (falhas.length > 0) {
      let key = falhas.join(' | ');
      if (!anomalies[key]) anomalies[key] = [];
      anomalies[key].push(num);
    }
  }

  console.log(`\n--- RELATÓRIO DE ANOMALIAS PROFUNDAS ---`);
  let found = false;
  for (const [key, rifas] of Object.entries(anomalies)) {
     found = true;
     console.log(`\n🔴 Anomalia: [${key}]`);
     console.log(`Afeta ${rifas.length} rifas. Ex: ${rifas.slice(0, 5).join(', ')}`);
  }
  
  if (!found) {
     console.log("\nNenhuma anomalia nova encontrada fora das mapeadas!");
  }
}

deepCompare().then(() => {
  console.log("\n=== FIM DA ANÁLISE ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
