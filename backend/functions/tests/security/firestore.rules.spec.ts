import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  // Lê as regras do Firestore
  const firestoreRules = fs.readFileSync(
    path.resolve(__dirname, "../../../firestore.rules"),
    "utf8"
  );

  // Inicializa o ambiente de teste apontando para o emulador
  testEnv = await initializeTestEnvironment({
    projectId: "rifasaderidos2026",
    firestore: {
      rules: firestoreRules,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv?.clearFirestore();
});

function obterTestEnv(): RulesTestEnvironment {
  if (!testEnv) {
    throw new Error("Ambiente de rules não inicializado.");
  }

  return testEnv;
}

describe("Segurança do Firestore - Coleção 'usuarios'", () => {
  it("Deve negar leitura para usuários não autenticados", async () => {
    const unauthedDb = obterTestEnv().unauthenticatedContext().firestore();
    const query = unauthedDb.collection("usuarios").get();
    await assertFails(query);
  });

  it("Deve negar leitura da lista de usuários para qualquer usuário autenticado", async () => {
    // Um aderido comum tentando ler os usuários agora é bloqueado (vazamento de dados).
    const authedDb = obterTestEnv().authenticatedContext("aderido123", { email: "aderido@test.com" }).firestore();
    const query = authedDb.collection("usuarios").get();
    await assertFails(query);
  });

  it("Deve permitir leitura do próprio documento", async () => {
    // Um aderido lendo apenas o próprio documento
    const authedDb = obterTestEnv().authenticatedContext("aderido123", { email: "aderido@test.com" }).firestore();
    const docRef = authedDb.collection("usuarios").doc("aderido123");
    await assertSucceeds(docRef.get());
  });

  it("Deve negar leitura da lista de usuários se tiver cargo de secretaria", async () => {
    const adminDb = obterTestEnv().authenticatedContext("admin456", { email: "admin@test.com", cargo: "secretaria" }).firestore();
    const query = adminDb.collection("usuarios").get();
    await assertFails(query);
  });
});

describe("Segurança do Firestore - Coleção 'bilhetes'", () => {
  it("Deve permitir leitura para usuários autenticados", async () => {
    const authedDb = obterTestEnv().authenticatedContext("user123", { email: "user@test.com" }).firestore();
    const query = authedDb.collection("bilhetes").get();
    await assertSucceeds(query);
  });

  it("Deve negar leitura para usuários não autenticados", async () => {
    const unauthedDb = obterTestEnv().unauthenticatedContext().firestore();
    const query = unauthedDb.collection("bilhetes").get();
    await assertFails(query);
  });

  it("Deve negar gravação direta em bilhetes (proteção contra fraudes)", async () => {
    const authedDb = obterTestEnv().authenticatedContext("user123", { email: "user@test.com" }).firestore();
    const docRef = authedDb.collection("bilhetes").doc("0001");
    await assertFails(docRef.set({ status: "comprado" }));
  });
});

describe("Segurança do Firestore - Coleção 'notificacoes'", () => {
  it("Deve permitir ler as próprias notificações", async () => {
    const ambiente = obterTestEnv();
    const authedDb = ambiente.authenticatedContext("vendedor1", { email: "user@test.com" }).firestore();
    // Primeiro precisamos burlar a regra para criar (no admin context)
    await ambiente.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("notificacoes").doc("notif1").set({
        vendedor_id: "vendedor1",
        mensagem: "Teste",
      });
    });

    const docRef = authedDb.collection("notificacoes").doc("notif1");
    await assertSucceeds(docRef.get());
  });

  it("Deve negar ler notificações de outros usuários", async () => {
    const ambiente = obterTestEnv();
    const authedDb = ambiente.authenticatedContext("vendedor2", { email: "user2@test.com" }).firestore();
    await ambiente.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("notificacoes").doc("notif1").set({
        vendedor_id: "vendedor1",
        mensagem: "Teste",
      });
    });

    const docRef = authedDb.collection("notificacoes").doc("notif1");
    await assertFails(docRef.get());
  });
});
