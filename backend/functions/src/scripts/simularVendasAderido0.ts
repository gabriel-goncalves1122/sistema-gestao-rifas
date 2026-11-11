/**
 * Script de simulação de vendas e geração de extrato bancário InfinitePay para o ADERIDO_001.
 *
 * Cria 3 compras simuladas com perfis variados (para testar os diferentes graus do motor
 * de conciliação: Match Exato por txid, Match por Nome do Comprador e Match por Nome do Vendedor),
 * anexa comprovantes no Storage e gera o arquivo 'extrato_simulado_infinitepay.csv' no layout oficial.
 *
 * Modos de execução:
 *   --local     : Executa contra o emulador local do Firestore (127.0.0.1:8080) [PADRÃO]
 *   --producao  : Executa diretamente contra o Firestore de PRODUÇÃO via chave-privada.json
 *   --dry-run   : Valida os bilhetes e simula sem persistir
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const PROJECT_ID = "rifasaderidos2026";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

const DADOS_VENDEDOR = {
  id: "ADERIDO_001",
  nome: "GABRIEL GONÇALVES SAMPAIO",
  cpf: "15403079630",
  email: "gabrielsampaio059@gmail.com",
};

interface GrupoDef {
  compradorNome: string;
  compradorTelefone: string;
  compradorEmail: string;
  quantidade: number;
  descricaoCenario: string;
  txidTipo: "exato" | "aleatorio" | "vendedor";
}

const GRUPOS_DEF: GrupoDef[] = [
  {
    compradorNome: "Mariana Souza Ribeiro",
    compradorTelefone: "35991234567",
    compradorEmail: "mariana.souza@teste.com",
    quantidade: 2,
    descricaoCenario: "Cenário 1: Match Grau 1 (Exato via txid)",
    txidTipo: "exato",
  },
  {
    compradorNome: "Carlos Eduardo Silva",
    compradorTelefone: "35998765432",
    compradorEmail: "carlos.silva@teste.com",
    quantidade: 3,
    descricaoCenario: "Cenário 2: Match Grau 3 (Aproximado via Nome do Comprador)",
    txidTipo: "aleatorio",
  },
  {
    compradorNome: "Fernanda Oliveira",
    compradorTelefone: "35987654321",
    compradorEmail: "fernanda.oliveira@teste.com",
    quantidade: 1,
    descricaoCenario: "Cenário 3: Match via Nome do Vendedor (repasse)",
    txidTipo: "vendedor",
  },
];

// ============================================================================
// CONFIGURAÇÃO DO AMBIENTE
// ============================================================================

const args = process.argv.slice(2);
const ehProducao = args.includes("--producao");
const ehDryRun = args.includes("--dry-run");

console.log("==================================================================");
console.log(`🎯 SCRIPT DE SIMULAÇÃO DE VENDAS - ${DADOS_VENDEDOR.nome}`);
console.log(
  `📌 Alvo: ${ehProducao ? "🚨 PRODUÇÃO REAL" : "🧪 EMULADOR LOCAL (127.0.0.1:8080)"}`,
);
console.log(`📌 Modo: ${ehDryRun ? "🔍 DRY-RUN (APENAS LEITURA)" : "⚡ PERSISTÊNCIA ATIVA"}`);
console.log(`📌 Projeto: ${PROJECT_ID}`);
console.log("==================================================================\n");

let app: admin.app.App;

if (ehProducao) {
  const caminhosPossiveis = [
    path.resolve(process.cwd(), "src/scripts/chave-privada.json"),
    path.resolve(process.cwd(), "backend/functions/src/scripts/chave-privada.json"),
    path.resolve(__dirname, "chave-privada.json"),
  ];

  const serviceAccountPath = caminhosPossiveis.find((p) => fs.existsSync(p));

  if (!serviceAccountPath) {
    throw new Error(
      "❌ Chave privada não encontrada para execução em produção. Salve em backend/functions/src/scripts/chave-privada.json",
    );
  }

  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  const serviceAccount = require(serviceAccountPath);
  app = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
      storageBucket: "rifasaderidos2026.firebasestorage.app",
    },
    `SIMULACAO_PROD_${Date.now()}`,
  );
} else {
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_EMULATOR_HOST;

  app = admin.initializeApp(
    {
      projectId: PROJECT_ID,
      storageBucket: "rifasaderidos2026.appspot.com",
    },
    `SIMULACAO_LOCAL_${Date.now()}`,
  );
}

const db = app.firestore();
if (!ehProducao) {
  db.settings({
    host: FIRESTORE_EMULATOR_HOST,
    ssl: false,
  });
}
const storage = app.storage();

/**
 * Gera o conteúdo visual de um comprovante simples em formato SVG institucional.
 */
function gerarSvgComprovante(
  compradorNome: string,
  valorReais: number,
  txid: string,
  dataIso: string,
): string {
  const dataFormatada = new Date(dataIso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const idTransacao = crypto.randomBytes(16).toString("hex").toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#063D31" />
      <stop offset="100%" stop-color="#0E5E4E" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1" />
    </filter>
  </defs>

  <rect width="600" height="700" fill="#F8FAFC" />

  <!-- Card Principal -->
  <rect x="30" y="30" width="540" height="640" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadow)" />

  <!-- Header -->
  <rect x="30" y="30" width="540" height="110" rx="16" fill="url(#headerGrad)" />
  <rect x="30" y="110" width="540" height="30" fill="url(#headerGrad)" />

  <text x="300" y="75" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" letter-spacing="1.5" text-anchor="middle">COMPROVANTE DE TRANSFERÊNCIA PIX</text>
  <text x="300" y="105" fill="#A7F3D0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="0.5" text-anchor="middle">SISTEMA DE GESTÃO DE RIFAS • COMISSÃO 2026</text>

  <!-- Valor Central -->
  <text x="300" y="185" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" text-anchor="middle">VALOR TRANSFERIDO</text>
  <text x="300" y="225" fill="#063D31" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" text-anchor="middle">R$ ${valorReais.toFixed(2).replace(".", ",")}</text>
  <text x="300" y="250" fill="#059669" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">✓ PAGAMENTO PROCESSADO</text>

  <!-- Divisor -->
  <line x1="60" y1="275" x2="540" y2="275" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 4" />

  <!-- Dados da Transação -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <!-- Destinatário -->
    <text x="60" y="315" fill="#64748B" font-size="11" font-weight="700">DESTINATÁRIO (RECEBEDOR)</text>
    <text x="60" y="335" fill="#0F172A" font-size="14" font-weight="800">Comissão de Formatura UNIFEI 2026</text>
    <text x="60" y="353" fill="#64748B" font-size="12">Chave Pix: d23badb8-4e1c-480b-ae3d-064a58bfe174 (InfinitePay)</text>

    <!-- Pagador -->
    <text x="60" y="395" fill="#64748B" font-size="11" font-weight="700">PAGADOR (COMPRADOR)</text>
    <text x="60" y="415" fill="#0F172A" font-size="14" font-weight="800">${compradorNome}</text>
    <text x="60" y="433" fill="#64748B" font-size="12">Instituição Bancária Associada</text>

    <!-- Data e Hora -->
    <text x="60" y="475" fill="#64748B" font-size="11" font-weight="700">DATA E HORÁRIO DA OPERAÇÃO</text>
    <text x="60" y="495" fill="#0F172A" font-size="13" font-weight="700">${dataFormatada}</text>

    <!-- Identificador e txid -->
    <text x="60" y="535" fill="#64748B" font-size="11" font-weight="700">IDENTIFICADOR DA COMPRA (TXID)</text>
    <text x="60" y="555" fill="#063D31" font-size="13" font-weight="800" font-family="monospace">${txid}</text>

    <!-- Autenticação Digital -->
    <text x="60" y="595" fill="#64748B" font-size="11" font-weight="700">AUTENTICAÇÃO DIGITAL / E2E</text>
    <text x="60" y="615" fill="#64748B" font-size="10" font-family="monospace">E1823612020261111${idTransacao}</text>
  </g>

  <!-- Rodapé -->
  <rect x="30" y="640" width="540" height="30" rx="0 0 16 16" fill="#F1F5F9" />
  <text x="300" y="659" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" text-anchor="middle">Comprovante gerado para fins de validação e auditoria interna</text>
</svg>`;
}

/**
 * Realiza upload do arquivo SVG de comprovante para o Firebase Storage e obtém a URL.
 */
async function uploadComprovanteStorage(
  txid: string,
  svgContent: string,
): Promise<string> {
  const nomeArquivo = `comprovantes/simulacao_${txid}.svg`;
  try {
    const bucket = storage.bucket();
    const file = bucket.file(nomeArquivo);

    await file.save(Buffer.from(svgContent, "utf-8"), {
      metadata: {
        contentType: "image/svg+xml",
        metadata: {
          simulacao: "true",
          txid,
        },
      },
    });

    // Se estiver no emulador local
    if (!ehProducao) {
      return `http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encodeURIComponent(nomeArquivo)}?alt=media`;
    }

    // Se estiver em produção, gera URL assinada ou pública
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2027-12-31",
    });
    return url;
  } catch (error: any) {
    console.warn(`⚠️ Não foi possível salvar comprovante no Storage: ${error.message}. Usando URL de contingência.`);
    return `https://storage.googleapis.com/rifasaderidos2026.firebasestorage.app/${nomeArquivo}`;
  }
}

/**
 * Executa a simulação e gravação atômica no Firestore.
 */
async function executarSimulacao(): Promise<void> {
  const agoraIso = new Date().toISOString();
  const trintaDiasDepois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  console.log("1. Buscando bilhetes disponíveis para " + DADOS_VENDEDOR.nome + "...");
  const snapLivres = await db.collection("bilhetes")
    .where("vendedor_id", "==", DADOS_VENDEDOR.id)
    .where("status", "==", "disponivel")
    .get();

  const bilhetesLivres = snapLivres.docs.map((d) => d.id).sort();
  console.log(`   ↳ Encontrados ${bilhetesLivres.length} bilhetes disponíveis.`);

  const totalNecessario = GRUPOS_DEF.reduce((acc, g) => acc + g.quantidade, 0);
  if (bilhetesLivres.length < totalNecessario) {
    throw new Error(
      `❌ Bilhetes disponíveis insuficientes (${bilhetesLivres.length} encontrados, ${totalNecessario} necessários)!`
    );
  }

  // Distribui os bilhetes nos grupos
  let indexCursor = 0;
  const gruposSimulacao = GRUPOS_DEF.map((def) => {
    const bilhetes = bilhetesLivres.slice(indexCursor, indexCursor + def.quantidade);
    indexCursor += def.quantidade;
    const valorReais = bilhetes.length * 10;
    const txid = `RIFA${bilhetes[0]}${bilhetes[bilhetes.length - 1]}`;

    return {
      ...def,
      bilhetes,
      valorReais,
      txid,
    };
  });

  for (const g of gruposSimulacao) {
    console.log(`   ↳ [${g.compradorNome}] Bilhetes: [${g.bilhetes.join(", ")}] | Valor: R$ ${g.valorReais},00 | txid: ${g.txid}`);
  }

  if (ehDryRun) {
    console.log("🔍 MODO DRY-RUN: Simulação validada com sucesso! Nenhuma alteração foi persistida.");
    return;
  }

  console.log("\n2. Gerando comprovantes visuais e persistindo compras transacionalmente...");

  for (const grupo of gruposSimulacao) {
    console.log(`\n📦 Processando: ${grupo.descricaoCenario}`);
    console.log(`   ↳ Comprador: ${grupo.compradorNome}`);
    console.log(`   ↳ Bilhetes: ${grupo.bilhetes.join(", ")} (Total: R$ ${grupo.valorReais},00)`);
    console.log(`   ↳ txid: ${grupo.txid}`);

    const svg = gerarSvgComprovante(
      grupo.compradorNome,
      grupo.valorReais,
      grupo.txid,
      agoraIso,
    );
    const comprovanteUrl = await uploadComprovanteStorage(grupo.txid, svg);
    console.log(`   ↳ Comprovante anexado: ${comprovanteUrl}`);

    await db.runTransaction(async (transaction) => {
      const compradorRef = db.collection("compradores").doc();
      const pagamentoRef = db.collection("pagamentos_pix").doc();

      // 1. Cria comprador
      transaction.set(compradorRef, {
        id: compradorRef.id,
        nome: grupo.compradorNome,
        telefone: grupo.compradorTelefone,
        email: grupo.compradorEmail,
        criado_em: agoraIso,
      });

      // 2. Cria pagamento central
      transaction.set(pagamentoRef, {
        id: pagamentoRef.id,
        status_pagamento_banco: "IN_ANALYSIS",
        status_validacao: "pendente",
        valor_bruto: grupo.valorReais,
        valor_pago: 0,
        numeros_rifas: grupo.bilhetes,
        vendedor_id: DADOS_VENDEDOR.id,
        vendedor_nome: DADOS_VENDEDOR.nome,
        comprador_id: compradorRef.id,
        comprador_nome: grupo.compradorNome,
        comprador_telefone: grupo.compradorTelefone,
        comprador_email: grupo.compradorEmail,
        pix_order_id: grupo.txid,
        comprovante_url: comprovanteUrl,
        data_reserva: agoraIso,
        data_expiracao: trintaDiasDepois,
        criado_em: agoraIso,
        atualizado_em: agoraIso,
        dados_conciliacao: {
          offline: true,
          geradoOffline: true,
          txid: grupo.txid,
          valor: grupo.valorReais,
        },
      });

      // 3. Atualiza os bilhetes para status 'pendente'
      for (const numero of grupo.bilhetes) {
        const bRef = db.collection("bilhetes").doc(numero);
        transaction.update(bRef, {
          status: "pendente",
          comprador_id: compradorRef.id,
          comprador_nome: grupo.compradorNome,
          comprador_telefone: grupo.compradorTelefone,
          comprador_email: grupo.compradorEmail,
          pix_order_id: grupo.txid,
          pix_reference_id: pagamentoRef.id,
          status_pagamento_banco: "IN_ANALYSIS",
          comprovante_url: comprovanteUrl,
          data_reserva: agoraIso,
          valor_bruto: 10,
          valor_pago: 0,
        });
      }
    });

    console.log(`   ✓ Compra registrada no banco com status 'pendente'!`);
  }

  // ============================================================================
  // GERAÇÃO DO ARQUIVO CSV OFICIAL DA INFINITEPAY
  // ============================================================================

  console.log("\n3. Gerando arquivo CSV formatado para InfinitePay...");

  const dataCsv = new Date().toLocaleDateString("pt-BR") + " 10:15";

  const g1 = gruposSimulacao[0];
  const g2 = gruposSimulacao[1];
  const g3 = gruposSimulacao[2];

  const linhasCsv = [
    "Data e hora,Meio - Meio,Meio - Bandeira,Meio - Parcelas,Tipo - Origem,Tipo - Dados adicionais,Identificador,Status,Valor (R$),Líquido (R$),Taxa Aplicada - Valor(R$),Taxa Aplicada - Aplicada(%),Plano,NSU,Origem - Nome",
    // Grupo 1: Match Grau 1 (Exato por txid)
    `${dataCsv},Pix,'-,1,Pix,'-,${g1.txid},Aprovada,"${g1.valorReais},00","${g1.valorReais},00","0,00",0,Na Hora,661f41ae-28cd-4e66-80ac-44772f860389,${g1.compradorNome}`,
    // Grupo 2: Match Grau 3 (Aproximado por Nome do Comprador)
    `${dataCsv},Pix,'-,1,Pix,'-,E1234567890123456789012345678901,Aprovada,"${g2.valorReais},00","${g2.valorReais},00","0,00",0,Na Hora,3c203d0d-b9ad-4c0a-a63c-0403756f7ccc,${g2.compradorNome}`,
    // Grupo 3: Match Grau 3 (Aproximado por Nome do Vendedor Gabriel)
    `${dataCsv},Pix,'-,1,Pix,'-,E9876543210987654321098765432109,Aprovada,"${g3.valorReais},00","${g3.valorReais},00","0,00",0,Na Hora,46e35079-d892-423b-9384-276f465aee12,${DADOS_VENDEDOR.nome}`,
    // Transação de Controle Negada (Deve ser ignorada pelo parser)
    `${dataCsv},Crédito,mastercard,4,Link de Pagamento,'-,000000,Negada,"150,00","150,00","0,00",0,1 Dia Útil,37c84e0b-e015-4880-8aeb-2e69b3efad21,Tentativa Falha Outro Pagador`,
  ];

  const conteudoCsv = linhasCsv.join("\n");
  const caminhosCsv = [
    path.resolve(process.cwd(), "extrato_simulado_infinitepay.csv"),
    path.resolve(process.cwd(), "../../extrato_simulado_infinitepay.csv"),
  ];

  for (const p of caminhosCsv) {
    try {
      fs.writeFileSync(p, conteudoCsv, "utf-8");
      console.log(`✓ CSV gerado com sucesso em: ${p}`);
    } catch {
      // Ignora erro se o caminho não existir
    }
  }

  // Salva também o arquivo de log com os bilhetes simulados para o zerarSimulacao
  const logSimulacao = {
    data: agoraIso,
    grupos: gruposSimulacao,
  };
  fs.writeFileSync(
    path.resolve(__dirname, "ultima_simulacao.json"),
    JSON.stringify(logSimulacao, null, 2),
    "utf-8"
  );

  console.log("\n==================================================================");
  console.log("🎉 SIMULAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("As 3 vendas estão no Firestore com status 'pendente' e comprovantes anexados.");
  console.log("O arquivo 'extrato_simulado_infinitepay.csv' foi gerado para você testar");
  console.log("a importação na tela da Tesouraria -> 'Validar transações'.");
  console.log("==================================================================");
}

executarSimulacao()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Erro durante a execução da simulação:", err);
    process.exit(1);
  });
