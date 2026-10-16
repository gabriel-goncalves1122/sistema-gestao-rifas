import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURAÇÕES GERAIS
// ============================================================================

const PROJECT_ID = "rifasaderidos2026";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const BATCH_LIMIT = 400;

const COLECOES_PARA_COPIAR = [
  "usuarios",
  "bilhetes",
  "compradores",
  "premios",
  "configuracoes",
  "notificacoes",
  "rifas",
  "pagamentos_pix",
  "pagamentos_pix_idempotencia",
  "contadores",
  "documentos_secretaria",
  "indices_usuarios_email",
];

// ============================================================================
// LOCALIZAÇÃO DA CHAVE PRIVADA
// ============================================================================
//
// O script é executado depois de compilado em:
// lib/scripts/copiarProducao.js
//
// Mas a chave fica no código-fonte:
// src/scripts/chave-privada.json
//
// Por isso usamos process.cwd(), que deve apontar para backend/functions.
//

const caminhosPossiveis = [
  path.resolve(process.cwd(), "src/scripts/chave-privada.json"),
  path.resolve(process.cwd(), "src/scripts/chave-privada.json.json"),
  path.resolve(process.cwd(), "backend/functions/src/scripts/chave-privada.json"),
  path.resolve(process.cwd(), "backend/functions/src/scripts/chave-privada.json.json"),
  path.resolve(__dirname, "chave-privada.json"),
  path.resolve(__dirname, "chave-privada.json.json"),
  path.resolve(__dirname, "../../src/scripts/chave-privada.json"),
  path.resolve(__dirname, "../../src/scripts/chave-privada.json.json"),
];

const serviceAccountPath = caminhosPossiveis.find((caminho) => fs.existsSync(caminho));

if (!serviceAccountPath) {
  throw new Error(
    `Arquivo chave-privada.json não encontrado. Verifique se ele está em backend/functions/src/scripts/chave-privada.json`,
  );
}

const serviceAccount = require(serviceAccountPath);

// ============================================================================
// CONEXÃO COM PRODUÇÃO
// ============================================================================

const prodApp = admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  },
  "PRODUCAO",
);

const dbProd = prodApp.firestore();

// ============================================================================
// CONEXÃO COM EMULADOR LOCAL
// ============================================================================

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

const localApp = admin.initializeApp(
  {
    projectId: PROJECT_ID,
  },
  "LOCAL",
);

const dbLocal = localApp.firestore();

dbLocal.settings({
  host: FIRESTORE_EMULATOR_HOST,
  ssl: false,
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

async function limparColecaoLocal(nomeColecao: string): Promise<void> {
  console.log(`\n🧹 Limpando coleção local: [${nomeColecao}]...`);

  let totalApagado = 0;

  while (true) {
    const snapshot = await dbLocal
      .collection(nomeColecao)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = dbLocal.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    totalApagado += snapshot.size;

    console.log(`   ↳ ${totalApagado} documentos apagados...`);
  }

  console.log(
    `✅ Coleção local [${nomeColecao}] limpa. Total apagado: ${totalApagado}`,
  );
}

async function copiarColecao(nomeColecao: string): Promise<void> {
  console.log(`\n📦 Copiando coleção: [${nomeColecao}]`);

  const snapshot = await dbProd.collection(nomeColecao).get();

  if (snapshot.empty) {
    console.log(`⚠️ Coleção [${nomeColecao}] vazia na produção. Pulando.`);
    return;
  }

  console.log(`🔎 Encontrados ${snapshot.size} documentos na produção.`);

  let batch = dbLocal.batch();
  let operacoesNoBatch = 0;
  let totalCopiado = 0;

  for (const doc of snapshot.docs) {
    const refLocal = dbLocal.collection(nomeColecao).doc(doc.id);

    batch.set(refLocal, doc.data(), { merge: false });

    operacoesNoBatch++;
    totalCopiado++;

    if (operacoesNoBatch >= BATCH_LIMIT) {
      await batch.commit();

      console.log(
        `   ↳ ${totalCopiado}/${snapshot.size} documentos copiados...`,
      );

      batch = dbLocal.batch();
      operacoesNoBatch = 0;
    }
  }

  if (operacoesNoBatch > 0) {
    await batch.commit();
  }

  console.log(
    `✅ Coleção [${nomeColecao}] copiada com sucesso. Total: ${totalCopiado}`,
  );
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

async function copiarBancoParaEmulador(): Promise<void> {
  console.log("🚀 Iniciando cópia da PRODUÇÃO para o EMULADOR LOCAL...");
  console.log(`📌 Projeto: ${PROJECT_ID}`);
  console.log(`📌 Emulador Firestore: ${FIRESTORE_EMULATOR_HOST}`);
  console.log(`📌 Chave usada: ${serviceAccountPath}`);

  for (const nomeColecao of COLECOES_PARA_COPIAR) {
    await limparColecaoLocal(nomeColecao);
    await copiarColecao(nomeColecao);
  }

  console.log("\n🎉 CÓPIA FINALIZADA COM SUCESSO!");
  console.log("O Firestore local foi atualizado com os dados da produção.");
}

copiarBancoParaEmulador()
  .then(async () => {
    await Promise.all(admin.apps.map((app) => app?.delete()));
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Erro fatal ao copiar banco:", error);
    await Promise.all(admin.apps.map((app) => app?.delete()));
    process.exit(1);
  });
