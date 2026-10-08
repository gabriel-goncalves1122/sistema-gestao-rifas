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

async function checkHigor() {
  console.log("=== INICIANDO ANALISE DE HIGOR (ADERIDO_071) ===");
  
  const bilhetesSnap = await db.collection('bilhetes')
    .where('vendedor_id', '==', 'ADERIDO_071')
    .get();
    
  console.log(`Total de bilhetes para Higor: ${bilhetesSnap.size}`);
  
  let corretos = [];
  let comErro = [];
  let semComprador = [];
  let semDataReserva = [];
  let comOutrosErros = [];

  bilhetesSnap.forEach(doc => {
    const data = doc.data();
    const num = doc.id;
    const isVendido = ['pago', 'reservado', 'pendente'].includes(data.status);
    
    if (isVendido) {
      let isError = false;
      let errosList = [];
      if (!data.comprador_id && !data.comprador_nome) {
        semComprador.push(num);
        errosList.push('Sem comprador');
        isError = true;
      }
      if (!data.data_reserva) {
        semDataReserva.push(num);
        errosList.push('Sem data de reserva');
        isError = true;
      }
      
      if (isError) {
        comErro.push({ numero: num, status: data.status, erros: errosList.join(', '), data });
      } else {
        corretos.push({ numero: num, status: data.status, data });
      }
    }
  });

  console.log(`\nCorretos (Vendidos/Reservados com todos os dados): ${corretos.length}`);
  console.log(`Com Erro: ${comErro.length}`);
  
  console.log("\n--- AMOSTRA DE BILHETES CORRETOS (MAX 2) ---");
  corretos.slice(0, 2).forEach(c => console.log(JSON.stringify(c, null, 2)));

  console.log("\n--- TODOS OS BILHETES COM ERRO ---");
  for (const c of comErro) {
    console.log(`\n[${c.numero}] - ${c.erros}`);
    console.log(JSON.stringify(c.data, null, 2));
    
    // Tenta encontrar em pagamentos_pix
    let pixId = c.data.pix_order_id || c.data.pix_reference_id;
    if (!pixId) {
       console.log("  -> NENHUM ID DE PIX ENCONTRADO NO BILHETE!");
       const pixQuery = await db.collection('pagamentos_pix').where('numeros_rifas', 'array-contains', c.numero).get();
       if (!pixQuery.empty) {
          console.log(`  -> Mas encontrado em pagamentos_pix por busca na array:`);
          pixQuery.forEach(p => console.log(`     ID Pix: ${p.id} | Comprador: ${p.data().comprador_nome}`));
       }
    } else {
       console.log(`  -> Procurando Pix usando ID: ${pixId}`);
       let pixQuery = await db.collection('pagamentos_pix').where('pix_order_id', '==', pixId).get();
       if (pixQuery.empty) {
         pixQuery = await db.collection('pagamentos_pix').where('reference_id', '==', pixId).get();
       }
       if (!pixQuery.empty) {
          console.log(`  -> Encontrado em pagamentos_pix!`);
          pixQuery.forEach(p => {
             console.log(`     ID Pix: ${p.id} | Comprador: ${p.data().comprador_nome} | Data Criacao: ${p.data().data_criacao}`);
          });
       } else {
          console.log(`  -> NÃO ENCONTRADO EM pagamentos_pix!`);
       }
    }
  }
}

checkHigor().then(() => {
  console.log("\n=== FIM DA ANÁLISE ===");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
