/**
 * Script de reenvio de e-mails de recibo para compradores dos aderidos Eduardo Siles e Francisco Siles.
 *
 * Agrupa os bilhetes com status "pago" por comprador (e-mail válido) e dispara o recibo oficial
 * sequencialmente com intervalo controlado (throttling) para não sobrecarregar o SMTP do Gmail.
 *
 * Modos de execução:
 *   npx tsx src/scripts/reenviarEmailsSiles.ts --local --dry-run
 *   npx tsx src/scripts/reenviarEmailsSiles.ts --producao --dry-run
 *   npx tsx src/scripts/reenviarEmailsSiles.ts --producao
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { enviarEmailRecibo } from "../modules/rifas/emailService";

const PROJECT_ID = "rifasaderidos2026";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const DELAY_ENTRE_EMAILS_MS = 2500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const args = process.argv.slice(2);
const ehProducao = args.includes("--producao");
const ehDryRun = args.includes("--dry-run");

/**
 * Carrega variáveis do arquivo .env de backend/functions caso SMTP_PASS ainda não esteja no ambiente.
 */
function carregarEnvLocal(): void {
  if (process.env.SMTP_PASS) return;

  const caminhosEnv = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend/functions/.env"),
    path.resolve(__dirname, "../../.env"),
  ];

  const envPath = caminhosEnv.find((p) => fs.existsSync(p));
  if (!envPath) return;

  const conteudo = fs.readFileSync(envPath, "utf-8");
  for (const linha of conteudo.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const idx = limpa.indexOf("=");
    if (idx === -1) continue;
    const chave = limpa.slice(0, idx).trim();
    const valor = limpa.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (chave && !process.env[chave]) {
      process.env[chave] = valor;
    }
  }
}

function normalizarTexto(texto: string): string {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inicializarFirestore(): admin.firestore.Firestore {
  if (ehProducao) {
    const caminhosPossiveis = [
      path.resolve(process.cwd(), "src/scripts/chave-privada.json"),
      path.resolve(process.cwd(), "backend/functions/src/scripts/chave-privada.json"),
      path.resolve(__dirname, "chave-privada.json"),
    ];

    const serviceAccountPath = caminhosPossiveis.find((p) => fs.existsSync(p));
    if (!serviceAccountPath) {
      throw new Error(
        "Chave privada não encontrada. Salve em backend/functions/src/scripts/chave-privada.json",
      );
    }

    delete process.env.FIRESTORE_EMULATOR_HOST;
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    });
  } else {
    process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
    admin.initializeApp({ projectId: PROJECT_ID });
  }

  return admin.firestore();
}

interface GrupoComprador {
  email: string;
  nome: string;
  vendedorNome: string;
  rifas: string[];
}

async function executar(): Promise<void> {
  carregarEnvLocal();

  console.log("==================================================================");
  console.log("📧 REENVIO DE RECIBOS - EDUARDO SILES / FRANCISCO SILES");
  console.log(`📌 Alvo: ${ehProducao ? "🚨 PRODUÇÃO REAL" : "🧪 EMULADOR LOCAL (127.0.0.1:8080)"}`);
  console.log(`📌 Modo: ${ehDryRun ? "🔍 DRY-RUN (SEM DISPARAR E-MAILS)" : "⚡ ENVIO ATIVO"}`);
  console.log(`📌 Intervalo entre envios: ${DELAY_ENTRE_EMAILS_MS}ms`);
  console.log("==================================================================\n");

  if (!ehDryRun && !process.env.SMTP_PASS) {
    throw new Error(
      "SMTP_PASS não encontrado no ambiente nem no .env. Configure antes de disparar e-mails reais.",
    );
  }

  const db = inicializarFirestore();

  console.log("1. Buscando aderidos Eduardo Siles e Francisco Siles...");
  const usuariosSnap = await db.collection("usuarios").get();
  const vendedoresAlvo = usuariosSnap.docs.filter((doc) => {
    const nome = normalizarTexto(doc.data().nome || "");
    return (
      nome.includes("siles") &&
      (nome.includes("eduardo") || nome.includes("francisco") || nome.includes("fransisco"))
    );
  });

  if (vendedoresAlvo.length === 0) {
    console.log("❌ Nenhum aderido encontrado com nome Eduardo Siles ou Francisco Siles.");
    return;
  }

  for (const v of vendedoresAlvo) {
    console.log(`   ↳ Encontrado: ${v.data().nome} (ID: ${v.id})`);
  }

  console.log("\n2. Buscando bilhetes pagos desses aderidos...");
  const gruposPorEmail = new Map<string, GrupoComprador>();
  let totalBilhetesPagos = 0;
  let bilhetesSemEmail = 0;

  for (const vendedorDoc of vendedoresAlvo) {
    const vendedorNome = String(vendedorDoc.data().nome || vendedorDoc.id);
    const bilhetesSnap = await db
      .collection("bilhetes")
      .where("vendedor_id", "==", vendedorDoc.id)
      .where("status", "==", "pago")
      .get();

    console.log(`   ↳ ${vendedorNome}: ${bilhetesSnap.size} bilhete(s) pago(s).`);

    for (const bDoc of bilhetesSnap.docs) {
      totalBilhetesPagos += 1;
      const d = bDoc.data();
      const email = String(d.comprador_email || "").trim().toLowerCase();

      if (!email || !EMAIL_REGEX.test(email)) {
        bilhetesSemEmail += 1;
        continue;
      }

      const chave = `${vendedorDoc.id}::${email}`;
      const existente = gruposPorEmail.get(chave);
      if (existente) {
        existente.rifas.push(bDoc.id);
      } else {
        gruposPorEmail.set(chave, {
          email,
          nome: String(d.comprador_nome || "Comprador").trim(),
          vendedorNome,
          rifas: [bDoc.id],
        });
      }
    }
  }

  const listaEnvios = Array.from(gruposPorEmail.values()).map((g) => ({
    ...g,
    rifas: g.rifas.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
  }));

  console.log("\n3. Resumo da fila de disparo:");
  console.log(`   • Total de bilhetes pagos: ${totalBilhetesPagos}`);
  console.log(`   • Bilhetes sem e-mail válido (ignorados): ${bilhetesSemEmail}`);
  console.log(`   • Destinatários únicos a notificar: ${listaEnvios.length}\n`);

  if (listaEnvios.length === 0) {
    console.log("ℹ️ Nenhum e-mail válido para envio.");
    return;
  }

  let enviados = 0;
  let falhas = 0;

  for (let i = 0; i < listaEnvios.length; i++) {
    const item = listaEnvios[i];
    const progresso = `[${i + 1}/${listaEnvios.length}]`;

    if (ehDryRun) {
      console.log(
        `${progresso} [DRY-RUN] ${item.nome} <${item.email}> | Vendedor: ${item.vendedorNome} | Rifas (${item.rifas.length}): ${item.rifas.join(", ")}`,
      );
      continue;
    }

    try {
      const ok = await enviarEmailRecibo(item.email, item.nome, item.rifas, "aprovado");
      if (ok) {
        enviados += 1;
        console.log(
          `${progresso} ✅ Enviado para ${item.nome} <${item.email}> (${item.rifas.length} rifa(s))`,
        );
      } else {
        falhas += 1;
        console.warn(`${progresso} ⚠️ Falha ao enviar para ${item.email}`);
      }
    } catch (erro: any) {
      falhas += 1;
      console.error(`${progresso} ❌ Erro ao enviar para ${item.email}:`, erro?.message || erro);
    }

    if (i < listaEnvios.length - 1) {
      await aguardar(DELAY_ENTRE_EMAILS_MS);
    }
  }

  console.log("\n==================================================================");
  if (ehDryRun) {
    console.log(`🔍 DRY-RUN concluído: ${listaEnvios.length} e-mail(s) seriam enviados.`);
  } else {
    console.log(`🏁 Concluído! Enviados: ${enviados} | Falhas: ${falhas}`);
  }
  console.log("==================================================================");
}

executar()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro fatal no script:", err);
    process.exit(1);
  });
