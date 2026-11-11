/**
 * Script de reversão / limpeza da simulação para as rifas 00002 a 00007 do ADERIDO_001.
 *
 * Restaura o status dos bilhetes para 'disponivel', remove compradores de teste
 * e cancela as transações de simulação criadas.
 *
 * Modos:
 *   --local     : Executa contra o emulador local [PADRÃO]
 *   --producao  : Executa contra o Firestore de Produção
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "rifasaderidos2026";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

let RIFAS_SIMULADAS = ["00002", "00003", "00004", "00005", "00008", "00012"];
const logPath = path.resolve(__dirname, "ultima_simulacao.json");
if (fs.existsSync(logPath)) {
  try {
    const raw = fs.readFileSync(logPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.grupos && Array.isArray(parsed.grupos)) {
      const nums = parsed.grupos.flatMap((g: any) => g.bilhetes || []);
      if (nums.length > 0) {
        RIFAS_SIMULADAS = nums;
      }
    }
  } catch {
    // Mantém padrão
  }
}
const ADERIDO_ID = "ADERIDO_001";

const args = process.argv.slice(2);
const ehProducao = args.includes("--producao");

console.log("==================================================================");
console.log(`🧹 LIMPEZA DE SIMULAÇÃO - RIFAS ${RIFAS_SIMULADAS.join(", ")}`);
console.log(`📌 Modo: ${ehProducao ? "🚨 PRODUÇÃO REAL" : "🧪 EMULADOR LOCAL"}`);
console.log("==================================================================\n");

let app: admin.app.App;

if (ehProducao) {
  const serviceAccountPath = path.resolve(__dirname, "chave-privada.json");
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("Chave privada não encontrada para produção.");
  }
  delete process.env.FIRESTORE_EMULATOR_HOST;
  const serviceAccount = require(serviceAccountPath);
  app = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    },
    `LIMPEZA_PROD_${Date.now()}`,
  );
} else {
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  app = admin.initializeApp(
    {
      projectId: PROJECT_ID,
    },
    `LIMPEZA_LOCAL_${Date.now()}`,
  );
}

const db = app.firestore();
if (!ehProducao) {
  db.settings({
    host: FIRESTORE_EMULATOR_HOST,
    ssl: false,
  });
}

async function limparSimulacao(): Promise<void> {
  const compradoresParaRemover = new Set<string>();
  const pagamentosParaRemover = new Set<string>();

  await db.runTransaction(async (transaction) => {
    for (const numero of RIFAS_SIMULADAS) {
      const ref = db.collection("bilhetes").doc(numero);
      const snap = await transaction.get(ref);

      if (!snap.exists) continue;

      const data = snap.data();
      if (data?.vendedor_id !== ADERIDO_ID) continue;

      if (data?.comprador_id) compradoresParaRemover.add(data.comprador_id);
      if (data?.pix_reference_id) pagamentosParaRemover.add(data.pix_reference_id);

      transaction.update(ref, {
        status: "disponivel",
        comprador_id: admin.firestore.FieldValue.delete(),
        comprador_nome: admin.firestore.FieldValue.delete(),
        comprador_email: admin.firestore.FieldValue.delete(),
        comprador_telefone: admin.firestore.FieldValue.delete(),
        data_reserva: admin.firestore.FieldValue.delete(),
        data_pagamento: admin.firestore.FieldValue.delete(),
        data_expiracao: admin.firestore.FieldValue.delete(),
        comprovante_url: admin.firestore.FieldValue.delete(),
        pix_order_id: admin.firestore.FieldValue.delete(),
        pix_qr_code_id: admin.firestore.FieldValue.delete(),
        pix_reference_id: admin.firestore.FieldValue.delete(),
        status_pagamento_banco: admin.firestore.FieldValue.delete(),
        status_validacao: admin.firestore.FieldValue.delete(),
        valor_bruto: admin.firestore.FieldValue.delete(),
        valor_pago: 0,
      });
    }

    compradoresParaRemover.forEach((id) => {
      transaction.delete(db.collection("compradores").doc(id));
    });

    pagamentosParaRemover.forEach((id) => {
      transaction.delete(db.collection("pagamentos_pix").doc(id));
    });
  });

  console.log(`✅ ${RIFAS_SIMULADAS.length} rifas resetadas para status 'disponivel'.`);
  console.log(`✅ ${compradoresParaRemover.size} compradores temporários removidos.`);
  console.log(`✅ ${pagamentosParaRemover.size} pagamentos Pix de teste removidos.`);
  console.log("Limpeza concluída com sucesso!");
}

limparSimulacao()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro ao limpar:", err);
    process.exit(1);
  });
