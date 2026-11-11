/**
 * Script de liberação e limpeza atômica das rifas 00002 a 00008 do aderido ADERIDO_001.
 * Limpa todos os dados de comprador, transações Pix associadas, locks de idempotência e
 * atualiza as métricas do aderido no Firestore de Produção.
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

const RIFAS_A_LIMPAR = [
  "00002",
  "00003",
  "00004",
  "00005",
  "00006",
  "00007",
  "00008",
];

const PAGAMENTOS_PIX_A_CANCELAR = [
  "GQSqgOPFNJWeeXppPhV8", // 00002
  "Wd9zQ89neiU927k5l3BP", // 00003
  "zD3898O5vHbeCiKnFcQD", // 00004
  "QdSIL4vHWVY4YHJvhIrp", // 00006 e 00007
  "lXyb20AxN4j4n0Nq37zo", // 00008
];

const IDEMPOTENCY_KEYS_A_REMOVER = [
  "b49c7d0d2048e5b98f9eed7166e9517ff4a05a0f7c9c13b2d2acd03e189290d1", // GQSqgOPFNJWeeXppPhV8
  "b0e01035fcdb75d9871b038d2a8f50bb0b1b7a4708f95c00256ae99dc3e6d411", // Wd9zQ89neiU927k5l3BP
  "2647bb7f56f52cf167862ce5471e465b21cc5102fd6c6a2a8ab332f7a6b9cff2", // zD3898O5vHbeCiKnFcQD
  "548f1721ec75ff9a67de356b1234245447b4ea483a550c9d3c7fb7f5f47f80e8", // QdSIL4vHWVY4YHJvhIrp
  "24ae068bf7405fc8eb52bfd5cffe65df3568df18dd7542baf38795a537e0c40a", // lXyb20AxN4j4n0Nq37zo
];

const ADERIDO_ID = "ADERIDO_001";

async function executarLimpeza() {
  console.log("==================================================================");
  console.log("Iniciando limpeza e liberação das rifas 00002 a 00008...");
  console.log("==================================================================");

  const agoraIso = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    // 1. LEITURAS (Reads)
    console.log("1. Lendo os 7 bilhetes...");
    const bilhetesRefs = RIFAS_A_LIMPAR.map((n) => db.collection("bilhetes").doc(n));
    const bilhetesSnaps = await Promise.all(bilhetesRefs.map((r) => transaction.get(r)));

    for (let i = 0; i < RIFAS_A_LIMPAR.length; i++) {
      const snap = bilhetesSnaps[i];
      const numero = RIFAS_A_LIMPAR[i];
      if (!snap.exists) {
        throw new Error(`Bilhete ${numero} não existe no Firestore!`);
      }
      const data = snap.data();
      if (data?.vendedor_id !== ADERIDO_ID) {
        throw new Error(`Bilhete ${numero} não pertence a ${ADERIDO_ID} (atual: ${data?.vendedor_id})`);
      }
    }

    console.log("2. Lendo os pagamentos Pix e documentos de idempotência...");
    const pixRefs = PAGAMENTOS_PIX_A_CANCELAR.map((id) => db.collection("pagamentos_pix").doc(id));
    const pixSnaps = await Promise.all(pixRefs.map((r) => transaction.get(r)));

    const idempRefs = IDEMPOTENCY_KEYS_A_REMOVER.map((k) =>
      db.collection("pagamentos_pix_idempotencia").doc(k)
    );
    const idempSnaps = await Promise.all(idempRefs.map((r) => transaction.get(r)));

    const userRef = db.collection("usuarios").doc(ADERIDO_ID);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new Error(`Usuário ${ADERIDO_ID} não encontrado!`);
    }

    console.log("✓ Todas as leituras e validações foram concluídas com sucesso.");

    // 2. ESCRITAS (Writes)
    console.log("3. Aplicando mutações atômicas...");

    // Zerar cada bilhete para status 'disponivel'
    for (let i = 0; i < bilhetesRefs.length; i++) {
      const ref = bilhetesRefs[i];
      const numero = RIFAS_A_LIMPAR[i];

      transaction.set(ref, {
        numero,
        status: "disponivel",
        vendedor_id: ADERIDO_ID,
        vendedor_nome: "GABRIEL GONÇALVES SAMPAIO",
        vendedor_cpf: "CPF não registado",
        vendedor_email: "gabrielsampaio059@gmail.com",

        comprador_id: null,
        comprador_nome: null,
        comprador_telefone: null,
        comprador_email: null,

        pix_order_id: null,
        pix_qr_code_id: null,
        pix_reference_id: null,
        status_pagamento_banco: null,
        status_validacao: null,

        valor_pago: 0,
        valor_bruto: 10,

        data_pagamento: null,
        data_reserva: null,
        data_expiracao: null,
        validado_em: null,
        validado_por: null,

        sessao_checkout_id: null,
        comprovante_url: null,
        log_automacao: null,
        motivo_recusa: null,
        correcao_pendente: null,
      });
    }

    // Cancelar os 5 pagamentos Pix
    for (let i = 0; i < pixRefs.length; i++) {
      const ref = pixRefs[i];
      const snap = pixSnaps[i];
      if (snap.exists) {
        transaction.update(ref, {
          status_pagamento_banco: "cancelled",
          status_validacao: null,
          motivo_negacao: "Rifas liberadas pelo administrador para recompra.",
          atualizado_em: agoraIso,
        });
      }
    }

    // Deletar os 5 locks de idempotência
    for (let i = 0; i < idempRefs.length; i++) {
      const ref = idempRefs[i];
      const snap = idempSnaps[i];
      if (snap.exists) {
        transaction.delete(ref);
      }
    }

    // Atualizar métricas de ADERIDO_001 (41 pagas = R$ 410,00)
    transaction.update(userRef, {
      rifas_vendidas: 41,
      total_arrecadado: 410,
      atualizado_em: agoraIso,
    });
  });

  console.log("\n==================================================================");
  console.log("🎉 SUCESSO: Todas as 7 rifas foram zeradas e liberadas com êxito!");
  console.log("==================================================================");
}

executarLimpeza()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO NA TRANSAÇÃO:", err);
    process.exit(1);
  });
