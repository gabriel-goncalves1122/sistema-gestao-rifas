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

async function analyzeAll() {
  console.log("=== INICIANDO ANALISE GLOBAL DE BILHETES ===");
  
  // Como não sabemos a data exata da implementação, vamos pegar todos os bilhetes que tem vínculo PIX ou estão com status vendido/reservado
  const bilhetesSnap = await db.collection('bilhetes').get();
  
  let totalAnalisados = 0;
  let erros = {
    semComprador: [],
    semDataReserva: [],
    limboPagamentoAtrasado: [], // pendente no bilhete mas pago no pix
    statusInconsistente: [] // pago no bilhete mas pix cancelado/pendente, etc
  };
  
  // Cache de pagamentos para evitar estourar limites de leitura se houver muitos
  // Mas como a base de PIX pode ser grande, vamos consultar sob demanda apenas quando necessário
  
  for (const doc of bilhetesSnap.docs) {
    const data = doc.data();
    const num = doc.id;
    
    // Focamos em transações PIX (que tem pix_order_id ou pix_reference_id)
    // Ou que pelo status deveriam ter dados completos
    const hasPixInfo = data.pix_order_id || data.pix_reference_id || data.pix_qr_code_id;
    const isVendido = ['pago', 'reservado', 'pendente'].includes(data.status);
    
    if (hasPixInfo || isVendido) {
      totalAnalisados++;
      
      let isSemComprador = !data.comprador_id && !data.comprador_nome;
      let isSemData = !data.data_reserva;
      
      if (isSemComprador) {
        erros.semComprador.push({ num, vendedor: data.vendedor_nome, status: data.status });
      }
      if (isSemData) {
        erros.semDataReserva.push({ num, vendedor: data.vendedor_nome, status: data.status });
      }
      
      // Analisando inconsistencias específicas
      // 1. Limbo de pagamento atrasado: status = pendente, motivo_recusa = expirado, status_pagamento_banco = approved
      if (data.status === 'pendente' && data.motivo_recusa && data.motivo_recusa.toLowerCase().includes('expirado') && data.status_pagamento_banco === 'approved') {
         erros.limboPagamentoAtrasado.push({ num, vendedor: data.vendedor_nome });
      }
      
      // 2. Pago no bilhete, mas sem approved no pix
      if (data.status === 'pago' && data.status_pagamento_banco && !['approved', 'authorized', 'PAID', 'AUTHORIZED'].includes(data.status_pagamento_banco) && hasPixInfo) {
         // ignora se foi validado manualmente
         if (data.status_validacao !== 'aceita') {
           erros.statusInconsistente.push({ num, vendedor: data.vendedor_nome, statusBanco: data.status_pagamento_banco });
         }
      }
    }
  }

  console.log(`\nTotal de Bilhetes Analisados (Com vínculo Pix ou Vendidos): ${totalAnalisados}`);
  console.log(`\n--- RESUMO DE OCORRÊNCIAS ---`);
  console.log(`1. Sem Comprador: ${erros.semComprador.length} bilhetes`);
  console.log(`2. Sem Data de Reserva: ${erros.semDataReserva.length} bilhetes`);
  console.log(`3. Limbo de Pagamento Atrasado (Expirou mas Pagou): ${erros.limboPagamentoAtrasado.length} bilhetes`);
  console.log(`4. Status Inconsistente (Bilhete Pago mas Pix ñ Pago sem validação manual): ${erros.statusInconsistente.length} bilhetes`);

  // Agrupando por vendedor para facilitar a visão (ex: Fernanda)
  console.log(`\n--- AGRUPAMENTO POR VENDEDOR (Top afetados) ---`);
  
  let vendedoresAfetados = {};
  [...erros.semComprador, ...erros.semDataReserva, ...erros.limboPagamentoAtrasado, ...erros.statusInconsistente].forEach(e => {
     let vend = e.vendedor || 'Desconhecido';
     if (!vendedoresAfetados[vend]) vendedoresAfetados[vend] = new Set();
     vendedoresAfetados[vend].add(e.num);
  });
  
  let sortedVendedores = Object.entries(vendedoresAfetados).sort((a,b) => b[1].size - a[1].size);
  sortedVendedores.forEach(([vend, rifasSet]) => {
     console.log(`- ${vend}: ${rifasSet.size} bilhetes com erro (${Array.from(rifasSet).join(', ')})`);
  });
}

analyzeAll().then(() => {
  console.log("\n=== FIM DA ANÁLISE ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
