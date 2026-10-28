/**
 * Script de regularização manual de rifas para a aderida Fabiana Palmiro Menegatti (ADERIDO_108).
 * Transforma 16 bilhetes que falharam no checkout automatizado em vendas manuais legadas aprovadas por comprovante.
 *
 * Suporta dois modos:
 *   --local     (padrão): Aplica no emulador local do Firestore (127.0.0.1:8080)
 *   --producao          : Aplica diretamente no Firestore de PRODUÇÃO via chave-privada.json
 *
 * @transactional Cada grupo de compra é processado atomicamente em uma transação isolada.
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURAÇÕES E DEFINIÇÕES
// ============================================================================

const PROJECT_ID = "rifasaderidos2026";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const DADOS_VENDEDORA = {
  id: "ADERIDO_108",
  nome: "Fabiana Palmiro Menegatti ",
  cpf: "336.102.218-52",
  email: "fabiana.menegatti@gmail.com",
};

interface GrupoRegularizacao {
  comprador: {
    id: string;
    nome: string;
    telefone: string;
    email: string | null;
  };
  rifas: string[];
}

const GRUPOS_REGULARIZACAO: GrupoRegularizacao[] = [
  {
    comprador: {
      id: "DddpMC4LcVOJY1WyT5K5",
      nome: "Júlia Campos Ribeiro",
      telefone: "35991621263",
      email: "fabiana.menegatti@gmail.com",
    },
    rifas: ["12931"],
  },
  {
    comprador: {
      id: "X8moASrMYkB0LHoXlR7Z",
      nome: "Daniel Tan Li",
      telefone: "(17) 98164-1864",
      email: null,
    },
    rifas: ["12899", "12900", "12901"],
  },
  {
    comprador: {
      id: "0y3k63efGxU3203sHwoR",
      nome: "Júlia Bernardes",
      telefone: "19981346752",
      email: "fabiana.menegatti@gmail.com",
    },
    rifas: [
      "12902",
      "12903",
      "12904",
      "12905",
      "12906",
      "12907",
      "12908",
      "12909",
      "12910",
      "12911",
    ],
  },
  {
    comprador: {
      id: "MidI5NXnQt0UO5djKXTI",
      nome: "Pedro Henrique Ferreira Alves",
      telefone: "(12) 99683-3909",
      email: "pedroohenriquealvess@gmail.com",
    },
    rifas: ["12912", "12913"],
  },
];

// ============================================================================
// INICIALIZAÇÃO DO AMBIENTE
// ============================================================================

const args = process.argv.slice(2);
const ehProducao = args.includes("--producao");

console.log("==================================================================");
console.log(`🎯 INICIALIZANDO SCRIPT DE REGULARIZAÇÃO - FABIANA MENEGATTI`);
console.log(`📌 Modo: ${ehProducao ? "🚨 PRODUÇÃO REAL" : "🧪 EMULADOR LOCAL"}`);
console.log(`📌 Projeto: ${PROJECT_ID}`);
console.log("==================================================================");

let app: admin.app.App;

if (ehProducao) {
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
    "REGULARIZACAO_PRODUCAO",
  );
} else {
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  app = admin.initializeApp(
    {
      projectId: PROJECT_ID,
    },
    "REGULARIZACAO_LOCAL",
  );
}

const db = app.firestore();

// ============================================================================
// EXECUÇÃO TRANSACIONAL POR COMPRA
// ============================================================================

async function executarRegularizacao(): Promise<void> {
  const agoraIso = new Date().toISOString();
  let totalProcessado = 0;

  for (const grupo of GRUPOS_REGULARIZACAO) {
    console.log(
      `\n📦 Processando compra de: [${grupo.comprador.nome}] (${grupo.rifas.length} rifas: ${grupo.rifas.join(", ")})`,
    );

    await db.runTransaction(async (transaction) => {
      // 1. TODAS AS LEITURAS (READS FIRST)
      const compradorRef = db.collection("compradores").doc(grupo.comprador.id);
      const compradorSnap = await transaction.get(compradorRef);

      const rifasRefs = grupo.rifas.map((num) => db.collection("bilhetes").doc(num));
      const rifasSnaps = await Promise.all(
        rifasRefs.map((ref) => transaction.get(ref)),
      );

      // Validação dos bilhetes do grupo
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

      // 2. TODAS AS ESCRITAS (WRITES)
      // Atualização consistente do comprador
      const dadosCompradorAtualizados = {
        id: grupo.comprador.id,
        nome: grupo.comprador.nome,
        telefone: grupo.comprador.telefone,
        email: grupo.comprador.email,
        criado_em: compradorSnap.exists
          ? compradorSnap.data()?.criado_em || agoraIso
          : agoraIso,
      };

      transaction.set(compradorRef, dadosCompradorAtualizados, { merge: true });

      // Atualização dos bilhetes
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
          comprovante_url: null,
          correcao_pendente: false,

          // Normalização do Vendedor
          vendedor_id: DADOS_VENDEDORA.id,
          vendedor_nome: DADOS_VENDEDORA.nome,
          vendedor_cpf: DADOS_VENDEDORA.cpf,
          vendedor_email: DADOS_VENDEDORA.email,

          // Dados do Comprador
          comprador_id: grupo.comprador.id,
          comprador_nome: grupo.comprador.nome,
          comprador_telefone: grupo.comprador.telefone,
          comprador_email: grupo.comprador.email,

          // Limpeza de campos residuais do Pix antigo
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
      `   ✅ Compra de [${grupo.comprador.nome}] commitada com sucesso! (${grupo.rifas.length} bilhetes pagos)`,
    );
  }

  console.log("\n==================================================================");
  console.log("🎉 TODAS AS TRANSAÇÕES CONCLUÍDAS COM SUCESSO!");
  console.log(`Total de bilhetes regularizados como PAGO: ${totalProcessado}`);
  console.log(`Total arrecadado registrado: R$ ${(totalProcessado * 10).toFixed(2)}`);
  console.log("==================================================================");
}

// ============================================================================
// PONTO DE ENTRADA
// ============================================================================

executarRegularizacao()
  .then(async () => {
    await app.delete();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ ERRO DURANTE A REGULARIZAÇÃO:", error);
    await app.delete();
    process.exit(1);
  });
