/**
 * Sincronização e consolidação das métricas operacionais da aderida Ana Laura Ribeiro Pinhão (ADERIDO_081).
 *
 * Recalcula dinamicamente a contagem real de bilhetes vendidos e o montante arrecadado
 * diretamente da coleção de bilhetes no Firestore de Produção e atualiza o documento de perfil.
 *
 * @transactional Atualiza atomicamente o documento do usuário via db.runTransaction().
 * @sideEffects Atualiza `rifas_vendidas`, `total_arrecadado` e `atualizado_em` em `usuarios/ADERIDO_081`.
 */

import * as admin from "firebase-admin";
import * as path from "path";

const keyPath = path.resolve(__dirname, "chave-privada.json");
const serviceAccount = require(keyPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "rifasaderidos2026",
  });
}

const db = admin.firestore();

const ADERIDO_ID = "ADERIDO_081";

async function sincronizarMetricas() {
  console.log("==================================================================");
  console.log(`🔄 SINCRONIZANDO MÉTRICAS - ANA LAURA RIBEIRO PINHÃO (${ADERIDO_ID})`);
  console.log("==================================================================");

  // 1. Busca todos os bilhetes vinculados à vendedora
  const bilhetesSnap = await db
    .collection("bilhetes")
    .where("vendedor_id", "==", ADERIDO_ID)
    .get();

  let totalPagos = 0;
  let totalDisponiveis = 0;
  let totalOutros = 0;

  bilhetesSnap.forEach((doc) => {
    const data = doc.data();
    if (data.status === "pago") {
      totalPagos++;
    } else if (data.status === "disponivel") {
      totalDisponiveis++;
    } else {
      totalOutros++;
    }
  });

  const totalArrecadado = totalPagos * 10;
  const agoraIso = new Date().toISOString();

  console.log(`📊 Contagem real de bilhetes no Firestore:`);
  console.log(`   - Total de bilhetes alocados: ${bilhetesSnap.size}`);
  console.log(`   - Bilhetes pagos:             ${totalPagos}`);
  console.log(`   - Bilhetes disponíveis:       ${totalDisponiveis}`);
  console.log(`   - Outros status:              ${totalOutros}`);
  console.log(`   - Valor total arrecadado:     R$ ${totalArrecadado.toFixed(2)}`);

  // 2. Executa transação atômica no Firestore para sincronizar o documento do usuário
  const userRef = db.collection("usuarios").doc(ADERIDO_ID);

  await db.runTransaction(async (t) => {
    const userDoc = await t.get(userRef);
    if (!userDoc.exists) {
      throw new Error(`Documento do usuário ${ADERIDO_ID} não encontrado.`);
    }

    const dadosAnteriores = userDoc.data();
    console.log(`\n📌 Estado anterior em usuarios/${ADERIDO_ID}:`);
    console.log(`   - rifas_vendidas: ${dadosAnteriores?.rifas_vendidas}`);
    console.log(`   - total_arrecadado: R$ ${dadosAnteriores?.total_arrecadado}`);

    t.update(userRef, {
      rifas_vendidas: totalPagos,
      total_arrecadado: totalArrecadado,
      atualizado_em: agoraIso,
    });
  });

  // 3. Verificação pós-atualização
  const userDocAtualizado = await userRef.get();
  const dadosFinais = userDocAtualizado.data();

  console.log(`\n✅ Estado final consolidado em usuarios/${ADERIDO_ID}:`);
  console.log(`   - rifas_vendidas: ${dadosFinais?.rifas_vendidas}`);
  console.log(`   - total_arrecadado: R$ ${dadosFinais?.total_arrecadado}`);
  console.log(`   - atualizado_em: ${dadosFinais?.atualizado_em}`);
  console.log("==================================================================");
  console.log("🎉 SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("==================================================================");
}

sincronizarMetricas()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro durante a sincronização:", err);
    process.exit(1);
  });
