/**
 * Script de injeção e regularização de rifas para a aderida Ana Laura Ribeiro Pinhão (ADERIDO_081).
 * Injeta 22 bilhetes pagos para 11 compradores distintos em transações atômicas no Firestore.
 *
 * Modos de execução:
 *   --local     : Executa contra o emulador local do Firestore (127.0.0.1:8080)
 *   --producao  : Executa diretamente contra o Firestore de PRODUÇÃO via chave-privada.json
 *   --dry-run   : Apenas valida a disponibilidade dos bilhetes e simula sem persistir
 *
 * @transactional Cada comprador é processado atomicamente via db.runTransaction().
 * @sideEffects Atualiza os 22 bilhetes, cria 11 compradores e sincroniza métricas em usuarios/ADERIDO_081.
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "rifasaderidos2026";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const DADOS_VENDEDORA = {
  id: "ADERIDO_081",
  nome: "ANA LAURA RIBEIRO PINHÃO ",
  cpf: "15196693608",
  email: "nalaurarp@gmail.com",
};

interface GrupoInjecao {
  nome: string;
  telefone: string;
  rifas: string[];
}

const GRUPOS_INJECAO: GrupoInjecao[] = [
  {
    nome: "Paula Fernanda Lima",
    telefone: "35997250297",
    rifas: ["09641", "09642", "09643"],
  },
  {
    nome: "Bruna Stefany Costa",
    telefone: "35984433841",
    rifas: ["09644", "09645"],
  },
  {
    nome: "Caroline Melo Carneiro",
    telefone: "35991842863",
    rifas: ["09646", "09647"],
  },
  {
    nome: "Marcia Flávia Melo",
    telefone: "35998558511",
    rifas: ["09648", "09649"],
  },
  {
    nome: "Salete",
    telefone: "35991898549",
    rifas: ["09650"],
  },
  {
    nome: "Luciana de Oliveira Lima Borges",
    telefone: "35991619650",
    rifas: ["09651", "09652"],
  },
  {
    nome: "Ana Carolina Silva de Oliveira Sá",
    telefone: "35999628127",
    rifas: ["09653"],
  },
  {
    nome: "Nadyne Barros",
    telefone: "35999765321",
    rifas: ["09654", "09655"],
  },
  {
    nome: "Giulia de Oliveira Cintra",
    telefone: "35997475389",
    rifas: ["09656", "09657"],
  },
  {
    nome: "Jamila Monteiro de Andrade",
    telefone: "35987139423",
    rifas: ["09658", "09659"],
  },
  {
    nome: "Luciane Ferreira Ribeiro dos Santos",
    telefone: "11982178484",
    rifas: ["09660", "09661", "09662"],
  },
];

// ============================================================================
// INICIALIZAÇÃO DO AMBIENTE
// ============================================================================

const args = process.argv.slice(2);
const ehProducao = args.includes("--producao");
const ehDryRun = args.includes("--dry-run");

console.log("==================================================================");
console.log(`🎯 INICIALIZANDO SCRIPT DE INJEÇÃO - ANA LAURA RIBEIRO PINHÃO`);
console.log(`📌 Modo: ${ehDryRun ? "🔍 SIMULAÇÃO (DRY-RUN)" : ehProducao ? "🚨 PRODUÇÃO REAL" : "🧪 EMULADOR LOCAL"}`);
console.log(`📌 Projeto: ${PROJECT_ID}`);
console.log("==================================================================");

let app: admin.app.App;

if (ehProducao || ehDryRun) {
  const caminhosPossiveis = [
    path.resolve(process.cwd(), "src/scripts/chave-privada.json"),
    path.resolve(process.cwd(), "src/scripts/chave-privada.json.json"),
    path.resolve(process.cwd(), "backend/functions/src/scripts/chave-privada.json"),
    path.resolve(process.cwd(), "backend/functions/src/scripts/chave-privada.json.json"),
    path.resolve(__dirname, "chave-privada.json"),
    path.resolve(__dirname, "chave-privada.json.json"),
    path.resolve(__dirname, "../../src/scripts/chave-privada.json"),
  ];

  const serviceAccountPath = caminhosPossiveis.find((p) => fs.existsSync(p));

  if (!serviceAccountPath) {
    throw new Error(
      "❌ Chave privada não encontrada para execução em produção. Salve em backend/functions/src/scripts/chave-privada.json",
    );
  }

  delete process.env.FIRESTORE_EMULATOR_HOST;

  const serviceAccount = require(serviceAccountPath);
  app = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    },
    `INJECAO_${Date.now()}`,
  );
} else {
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  app = admin.initializeApp(
    {
      projectId: PROJECT_ID,
    },
    `INJECAO_LOCAL_${Date.now()}`,
  );
}

const db = app.firestore();

// ============================================================================
// EXECUÇÃO TRANSACIONAL
// ============================================================================

async function executarInjecao(): Promise<void> {
  const agoraIso = new Date().toISOString();
  let totalProcessado = 0;

  for (const grupo of GRUPOS_INJECAO) {
    console.log(
      `\n📦 Processando compra de: [${grupo.nome}] (${grupo.rifas.length} rifas: ${grupo.rifas.join(", ")})`,
    );

    if (ehDryRun) {
      // No modo dry-run, apenas lê e valida
      for (const numero of grupo.rifas) {
        const snap = await db.collection("bilhetes").doc(numero).get();
        if (!snap.exists) {
          throw new Error(`[ABORTADO] Bilhete [${numero}] não existe no Firestore!`);
        }
        const b = snap.data();
        if (b?.vendedor_id !== DADOS_VENDEDORA.id) {
          throw new Error(
            `[ABORTADO] Bilhete [${numero}] pertence a outro vendedor: ${b?.vendedor_id} (esperado: ${DADOS_VENDEDORA.id})`,
          );
        }
        if (b?.status !== "disponivel") {
          throw new Error(
            `[ABORTADO] Bilhete [${numero}] não está disponível! Status atual: ${b?.status}`,
          );
        }
      }
      console.log(`   🔎 [DRY-RUN] Validação bem-sucedida para [${grupo.nome}].`);
      totalProcessado += grupo.rifas.length;
      continue;
    }

    // Execução transacional real
    await db.runTransaction(async (transaction) => {
      // 1. LEITURAS PRIMEIRO (READS)
      const rifasRefs = grupo.rifas.map((num) => db.collection("bilhetes").doc(num));
      const rifasSnaps = await Promise.all(
        rifasRefs.map((ref) => transaction.get(ref)),
      );

      for (let i = 0; i < rifasRefs.length; i++) {
        const snap = rifasSnaps[i];
        const numero = grupo.rifas[i];

        if (!snap.exists) {
          throw new Error(`[ABORTADO] Bilhete [${numero}] não existe no Firestore!`);
        }

        const bilhete = snap.data();

        if (bilhete?.vendedor_id !== DADOS_VENDEDORA.id) {
          throw new Error(
            `[ABORTADO] Bilhete [${numero}] pertence a outro vendedor: ${bilhete?.vendedor_id} (esperado: ${DADOS_VENDEDORA.id})`,
          );
        }

        if (bilhete?.status !== "disponivel") {
          throw new Error(
            `[ABORTADO] Bilhete [${numero}] não está disponível! Status atual: ${bilhete?.status}`,
          );
        }
      }

      // 2. ESCRITAS (WRITES)
      const compradorRef = db.collection("compradores").doc();
      const dadosComprador = {
        id: compradorRef.id,
        nome: grupo.nome,
        telefone: grupo.telefone,
        email: null,
        vendedor_id: DADOS_VENDEDORA.id,
        vendedor_nome: DADOS_VENDEDORA.nome,
        numeros_rifas: grupo.rifas,
        quantidade_rifas: grupo.rifas.length,
        valor_total: grupo.rifas.length * 10,
        criado_em: agoraIso,
        atualizado_em: agoraIso,
      };

      transaction.set(compradorRef, dadosComprador);

      for (const numero of grupo.rifas) {
        const bilheteRef = db.collection("bilhetes").doc(numero);

        const atualizacaoBilhete: Record<string, any> = {
          numero,
          status: "pago",
          status_validacao: "aceita",
          validado_em: agoraIso,
          validado_por: "admin_regularizacao_manual",
          data_pagamento: agoraIso,
          data_reserva: agoraIso,
          valor_bruto: 10,
          valor_pago: 10,
          comprovante_url: null,
          correcao_pendente: null,
          motivo_recusa: null,
          log_automacao: null,

          // Vendedor
          vendedor_id: DADOS_VENDEDORA.id,
          vendedor_nome: DADOS_VENDEDORA.nome,
          vendedor_cpf: DADOS_VENDEDORA.cpf,
          vendedor_email: DADOS_VENDEDORA.email,

          // Comprador
          comprador_id: compradorRef.id,
          comprador_nome: grupo.nome,
          comprador_telefone: grupo.telefone,
          comprador_email: null,

          // Limpeza preventiva de flags Pix residuais
          pix_order_id: null,
          pix_qr_code_id: null,
          pix_reference_id: null,
          status_pagamento_banco: null,
        };

        transaction.set(bilheteRef, atualizacaoBilhete, { merge: true });
      }
    });

    totalProcessado += grupo.rifas.length;
    console.log(
      `   ✅ Compra de [${grupo.nome}] comitada com sucesso! (${grupo.rifas.length} bilhetes pagos)`,
    );
  }

  if (ehDryRun) {
    console.log("\n==================================================================");
    console.log(`🔎 [DRY-RUN CONCLUÍDO]: Todos os ${totalProcessado} bilhetes foram validados com sucesso.`);
    console.log("Nenhum dado foi alterado no banco.");
    console.log("==================================================================");
    return;
  }

  // 3. SINCRONIZAÇÃO DAS MÉTRICAS EM usuarios/ADERIDO_081
  console.log("\n📊 Sincronizando métricas em usuarios/ADERIDO_081...");
  const bilhetesVendedoraSnap = await db
    .collection("bilhetes")
    .where("vendedor_id", "==", DADOS_VENDEDORA.id)
    .get();

  const totalPagas = bilhetesVendedoraSnap.docs.filter(
    (d) => d.data().status === "pago",
  ).length;
  const totalArrecadado = totalPagas * 10;

  await db.collection("usuarios").doc(DADOS_VENDEDORA.id).set(
    {
      rifas_vendidas: totalPagas,
      total_arrecadado: totalArrecadado,
      atualizado_em: agoraIso,
    },
    { merge: true },
  );

  console.log(`   ✅ Métricas atualizadas: ${totalPagas} rifas pagas, R$ ${totalArrecadado.toFixed(2)} arrecadados.`);

  console.log("\n==================================================================");
  console.log("🎉 TODAS AS 11 TRANSAÇÕES FORAM CONCLUÍDAS COM SUCESSO!");
  console.log(`Total de bilhetes injetados como PAGO  : ${totalProcessado}`);
  console.log(`Total de rifas pagas da Ana Laura     : ${totalPagas}`);
  console.log(`Total arrecadado pela Ana Laura       : R$ ${totalArrecadado.toFixed(2)}`);
  console.log("==================================================================");
}

// ============================================================================
// PONTO DE ENTRADA
// ============================================================================

executarInjecao()
  .then(async () => {
    await app.delete();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ ERRO DURANTE A INJEÇÃO:", error);
    await app.delete();
    process.exit(1);
  });
