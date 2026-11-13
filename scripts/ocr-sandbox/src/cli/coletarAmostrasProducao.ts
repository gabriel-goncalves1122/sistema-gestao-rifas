// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/cli/coletarAmostrasProducao.ts
// ============================================================================
// Script SOMENTE-LEITURA para diagnosticar comprovantes em produção
// (`rifasaderidos2026`) e baixar amostras reais para a pasta ignorada
// `scripts/ocr-sandbox/amostras/` visando benchmark local do OCR.
// ============================================================================

import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { CasoTesteAmostra } from "../types/ocrSandboxTypes.js";

const PROJECT_ID = "rifasaderidos2026";
const BUCKETS_CANDIDATOS = [
  "rifasaderidos2026.firebasestorage.app",
  "rifasaderidos2026.appspot.com",
];

interface RegistroCandidatoAmostra {
  origemColecao: "pagamentos_pix" | "bilhetes";
  idDocumento: string;
  statusSistema: string;
  provedor: string;
  txidEsperado: string;
  referenceId?: string;
  valorCentavos: number;
  dataCriacaoIso?: string;
  caminhoStorageOriginal: string;
  bucketExplicitoUrl: string | null;
  caminhoObjetoNormalizado: string;
  extensaoInferida: string;
  origemLabel: string;
}

interface StorageFileLike {
  name: string;
  exists(): Promise<[boolean]>;
  download(): Promise<[Buffer]>;
}

interface StorageBucketLike {
  exists(): Promise<[boolean]>;
  getFiles(opts: {
    prefix?: string;
    delimiter?: string;
    maxResults?: number;
  }): Promise<[StorageFileLike[]]>;
  file(name: string): StorageFileLike;
}

interface StorageLike {
  bucket(name: string): StorageBucketLike;
}

function extrairBucketECaminho(valorUrlOuPath: string): {
  bucketUrl: string | null;
  caminhoObjeto: string;
} {
  const limpo = (valorUrlOuPath || "").trim();

  // Caso 1: URL HTTPS do Firebase Storage
  // Ex: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media...
  const matchHttps = limpo.match(
    /^https?:\/\/firebasestorage\.googleapis\.com\/v\d+\/b\/([^/]+)\/o\/([^?]+)/i,
  );
  if (matchHttps) {
    return {
      bucketUrl: decodeURIComponent(matchHttps[1]),
      caminhoObjeto: decodeURIComponent(matchHttps[2]),
    };
  }

  // Caso 2: URL gs://<bucket>/<path>
  const matchGs = limpo.match(/^gs:\/\/([^/]+)\/(.+)$/i);
  if (matchGs) {
    return {
      bucketUrl: matchGs[1],
      caminhoObjeto: matchGs[2],
    };
  }

  // Caso 3: Caminho direto no bucket (ex: comprovantes/123_arquivo.pdf)
  return {
    bucketUrl: null,
    caminhoObjeto: limpo.replace(/^\/+/, ""),
  };
}

function derivarTxidEsperado(
  pixOrderId: unknown,
  referenceId: unknown,
  idFallback: string,
): string {
  if (typeof pixOrderId === "string" && /^RIFA[A-Z0-9]+$/i.test(pixOrderId.trim())) {
    return pixOrderId.trim().toUpperCase();
  }

  const base =
    typeof referenceId === "string" && referenceId.trim()
      ? referenceId.trim()
      : idFallback;
  const limpo = base.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const sufixo = limpo.slice(-10) || limpo;
  return `RIFA${sufixo}`.substring(0, 25);
}

function inferirExtensao(caminhoObjeto: string): string {
  const ext = path.extname(caminhoObjeto.split("?")[0]).toLowerCase();
  return ext || ".bin";
}

function incrementarMapa(mapa: Record<string, number>, chave: string): void {
  mapa[chave] = (mapa[chave] ?? 0) + 1;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const apenasDiagnostico = args.has("--diagnostico");
  const limiteArg = process.argv.find((a) => a.startsWith("--limite="));
  const limiteDownload = limiteArg ? Number.parseInt(limiteArg.split("=")[1], 10) : 15;

  const raizSandbox = path.resolve(import.meta.dirname, "../..");
  const raizRepo = path.resolve(raizSandbox, "../..");
  const pastaAmostras = path.join(raizSandbox, "amostras");

  const caminhoChave = path.join(
    raizRepo,
    "backend/functions/src/scripts/chave-privada.json",
  );

  // Garante conexão real com produção (nunca emulador)
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  const requireBackend = createRequire(
    path.join(raizRepo, "backend/functions/package.json"),
  );
  const admin = requireBackend("firebase-admin");
  const serviceAccount = requireBackend(caminhoChave);

  const app = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
      storageBucket: BUCKETS_CANDIDATOS[0],
    },
    `OCR_SANDBOX_READONLY_${Date.now()}`,
  );

  try {
    const db = app.firestore();
    const storage = app.storage() as StorageLike;

    // 1. Verificar quais buckets respondem e quantos arquivos possuem nos prefixos conhecidos
    console.log("\n=== 1. DIAGNOSTICO DE BUCKETS NO STORAGE ===");
    let bucketAtivoNome: string | null = null;

    for (const nomeBucket of BUCKETS_CANDIDATOS) {
      const bucket = storage.bucket(nomeBucket);
      const [existe] = await bucket.exists();
      if (!existe) {
        console.log(`- ${nomeBucket}: NAO EXISTE`);
        continue;
      }

      if (!bucketAtivoNome) bucketAtivoNome = nomeBucket;

      const [arquivosComprovantes] = await bucket.getFiles({
        prefix: "comprovantes/",
        maxResults: 500,
      });
      const [arquivosAtrasados] = await bucket.getFiles({
        prefix: "comprovantes_atrasados/",
        maxResults: 500,
      });
      const [arquivosRaiz] = await bucket.getFiles({
        delimiter: "/",
        maxResults: 50,
      });

      const amostraNomes = [
        ...arquivosComprovantes.slice(0, 3).map((f) => f.name),
        ...arquivosAtrasados.slice(0, 2).map((f) => f.name),
      ];

      console.log(`- ${nomeBucket}: EXISTE`);
      console.log(`  * prefix 'comprovantes/': ${arquivosComprovantes.length} arquivos (limite consulta 500)`);
      console.log(`  * prefix 'comprovantes_atrasados/': ${arquivosAtrasados.length} arquivos`);
      console.log(`  * objetos na raiz: ${arquivosRaiz.length}`);
      if (amostraNomes.length > 0) {
        console.log(`  * exemplos de caminho: ${amostraNomes.join(" | ")}`);
      }
    }

    // 2. Diagnóstico da coleção `pagamentos_pix`
    console.log("\n=== 2. DIAGNOSTICO FIRESTORE: pagamentos_pix ===");
    const pagamentosSnap = await db.collection("pagamentos_pix").get();
    const statsPagStatus: Record<string, number> = {};
    const statsPagProvedor: Record<string, number> = {};
    const statsPagFormatoUrl: Record<string, number> = {};
    const statsPagExtensao: Record<string, number> = {};
    const statsPagTxid: Record<string, number> = {};
    const candidatos: RegistroCandidatoAmostra[] = [];
    const caminhosVistos = new Set<string>();

    for (const doc of pagamentosSnap.docs) {
      const d = doc.data();
      const status = String(d.status_pagamento_banco || "SEM_STATUS");
      const provedor = String(d.provedor_pagamento || "NAO_INFORMADO");
      incrementarMapa(statsPagStatus, status);
      incrementarMapa(statsPagProvedor, provedor);

      const url = typeof d.comprovante_url === "string" ? d.comprovante_url.trim() : "";
      if (!url) continue;

      const { bucketUrl, caminhoObjeto } = extrairBucketECaminho(url);
      const ext = inferirExtensao(caminhoObjeto);
      const formato = url.startsWith("http")
        ? "URL_HTTPS"
        : url.startsWith("gs://")
          ? "URL_GS"
          : "CAMINHO_STORAGE";

      incrementarMapa(statsPagFormatoUrl, formato);
      incrementarMapa(statsPagExtensao, ext);

      const pixOrderId = typeof d.pix_order_id === "string" ? d.pix_order_id : "";
      const tipoTxid = pixOrderId.startsWith("RIFA")
        ? "RIFA_TXID"
        : pixOrderId
          ? "OUTRO_ORDER_ID"
          : "SEM_ORDER_ID";
      incrementarMapa(statsPagTxid, tipoTxid);

      if (!caminhosVistos.has(caminhoObjeto)) {
        caminhosVistos.add(caminhoObjeto);
        const valorBrutoReais = Number(d.valor_bruto ?? d.valor_pago ?? 0);
        candidatos.push({
          origemColecao: "pagamentos_pix",
          idDocumento: doc.id,
          statusSistema: status,
          provedor,
          txidEsperado: derivarTxidEsperado(d.pix_order_id, d.reference_id, doc.id),
          referenceId: typeof d.reference_id === "string" ? d.reference_id : undefined,
          valorCentavos: Math.round((Number.isFinite(valorBrutoReais) ? valorBrutoReais : 0) * 100),
          dataCriacaoIso: typeof d.data_criacao === "string" ? d.data_criacao : undefined,
          caminhoStorageOriginal: url,
          bucketExplicitoUrl: bucketUrl,
          caminhoObjetoNormalizado: caminhoObjeto,
          extensaoInferida: ext,
          origemLabel: "pagamentos_pix",
        });
      }
    }

    console.log(`Total de documentos em pagamentos_pix: ${pagamentosSnap.size}`);
    console.log("Por status_pagamento_banco:", statsPagStatus);
    console.log("Por provedor_pagamento:", statsPagProvedor);
    console.log("Com comprovante_url - formato:", statsPagFormatoUrl);
    console.log("Com comprovante_url - extensao:", statsPagExtensao);
    console.log("Com comprovante_url - pix_order_id:", statsPagTxid);

    // 3. Diagnóstico da coleção `bilhetes` com comprovante_url
    console.log("\n=== 3. DIAGNOSTICO FIRESTORE: bilhetes (com comprovante_url) ===");
    const bilhetesComComprovanteSnap = await db
      .collection("bilhetes")
      .where("comprovante_url", "!=", null)
      .get();

    const statsBilStatus: Record<string, number> = {};
    const statsBilFormato: Record<string, number> = {};
    const statsBilExt: Record<string, number> = {};
    let bilhetesForaPagamentos = 0;

    for (const doc of bilhetesComComprovanteSnap.docs) {
      const d = doc.data();
      const url = typeof d.comprovante_url === "string" ? d.comprovante_url.trim() : "";
      if (!url) continue;

      incrementarMapa(statsBilStatus, String(d.status || "SEM_STATUS"));
      const { bucketUrl, caminhoObjeto } = extrairBucketECaminho(url);
      const ext = inferirExtensao(caminhoObjeto);
      const formato = url.startsWith("http")
        ? "URL_HTTPS"
        : url.startsWith("gs://")
          ? "URL_GS"
          : "CAMINHO_STORAGE";

      incrementarMapa(statsBilFormato, formato);
      incrementarMapa(statsBilExt, ext);

      if (!caminhosVistos.has(caminhoObjeto)) {
        bilhetesForaPagamentos++;
        caminhosVistos.add(caminhoObjeto);

        const valorBilheteReais = Number(d.valor ?? d.valor_pago ?? 0);
        candidatos.push({
          origemColecao: "bilhetes",
          idDocumento: doc.id,
          statusSistema: String(d.status || "SEM_STATUS"),
          provedor: String(d.origem_pagamento || "BILHETE_LEGADO"),
          txidEsperado: derivarTxidEsperado(d.pix_order_id, d.pagamento_id || doc.id, doc.id),
          referenceId: typeof d.pagamento_id === "string" ? d.pagamento_id : undefined,
          valorCentavos: Math.round((Number.isFinite(valorBilheteReais) ? valorBilheteReais : 0) * 100),
          dataCriacaoIso: typeof d.data_reserva === "string" ? d.data_reserva : undefined,
          caminhoStorageOriginal: url,
          bucketExplicitoUrl: bucketUrl,
          caminhoObjetoNormalizado: caminhoObjeto,
          extensaoInferida: ext,
          origemLabel: "bilhetes_sem_pagamentos_pix",
        });
      } else {
        const existente = candidatos.find(
          (c) =>
            c.origemColecao === "bilhetes" &&
            c.caminhoObjetoNormalizado === caminhoObjeto,
        );
        if (existente) {
          const valorAdicional = Number(d.valor ?? d.valor_pago ?? 0);
          if (Number.isFinite(valorAdicional) && valorAdicional > 0) {
            existente.valorCentavos += Math.round(valorAdicional * 100);
          }
        }
      }
    }

    console.log(`Total de bilhetes com comprovante_url != null: ${bilhetesComComprovanteSnap.size}`);
    console.log("Por status:", statsBilStatus);
    console.log("Por formato URL:", statsBilFormato);
    console.log("Por extensao:", statsBilExt);
    console.log(`Arquivos unicos extras apenas em bilhetes: ${bilhetesForaPagamentos}`);
    console.log(`Total de comprovantes unicos encontrados no banco: ${candidatos.length}`);

    if (apenasDiagnostico) {
      console.log("\nModo --diagnostico ativo: nenhum arquivo foi baixado.");
      return;
    }

    // 4. Selecionar amostra diversa e baixar para scripts/ocr-sandbox/amostras/
    if (candidatos.length === 0) {
      console.log("\nNenhum comprovante encontrado no banco para download.");
      return;
    }

    const selecionados = selecionarAmostraDiversa(candidatos, limiteDownload);
    await fs.mkdir(pastaAmostras, { recursive: true });

    console.log(
      `\n=== 4. BAIXANDO ${selecionados.length} AMOSTRAS REAIS PARA ${pastaAmostras} ===`,
    );

    let baixados = 0;
    let naoEncontradosStorage = 0;

    for (let i = 0; i < selecionados.length; i++) {
      const item = selecionados[i];
      const nomeBucketParaUsar =
        item.bucketExplicitoUrl || bucketAtivoNome || BUCKETS_CANDIDATOS[0];

      const { buffer, bucketUsado } = await baixarArquivoDeBuckets(
        storage,
        item.caminhoObjetoNormalizado,
        [nomeBucketParaUsar, ...BUCKETS_CANDIDATOS],
      );

      if (!buffer) {
        naoEncontradosStorage++;
        console.log(
          `[AUSENTE NO STORAGE] ${item.origemColecao}/${item.idDocumento} -> ${item.caminhoObjetoNormalizado}`,
        );
        continue;
      }

      const prefixoIdx = String(i + 1).padStart(2, "0");
      const extFinal = item.extensaoInferida !== ".bin" ? item.extensaoInferida : ".dat";
      const slugBase = `${prefixoIdx}_${item.origemColecao}_${item.statusSistema.toLowerCase()}_${item.idDocumento.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      const caminhoArquivoLocal = path.join(pastaAmostras, `${slugBase}${extFinal}`);
      const caminhoCasoLocal = path.join(pastaAmostras, `${slugBase}.caso.json`);

      const caso: CasoTesteAmostra = {
        descricao: `Amostra real (${item.origemColecao}, status=${item.statusSistema}, provedor=${item.provedor}, bucket=${bucketUsado}, path=${item.caminhoObjetoNormalizado})`,
        pedido: {
          pagamentoId: item.idDocumento,
          txidEsperado: item.txidEsperado,
          referenceId: item.referenceId,
          valorCentavos: item.valorCentavos,
          recebedorEsperado: "8805",
          recebedorAliases: [
            "COMISSAO FORMATURA UNIFEI",
            "COMISSAO DE FORMATURA UNIFEI 2026",
            "CLOUDWALK IP LTDA",
          ],
          cnpjRecebedorEsperado: "54789437000185",
          dataCriacaoIso: item.dataCriacaoIso,
          e2eIdsJaUtilizados: [],
        },
      };

      await fs.writeFile(caminhoArquivoLocal, buffer);
      await fs.writeFile(caminhoCasoLocal, JSON.stringify(caso, null, 2), "utf-8");
      baixados++;
      console.log(
        `[OK] ${path.basename(caminhoArquivoLocal)} (${(buffer.length / 1024).toFixed(1)} KB, valor=R$${(item.valorCentavos / 100).toFixed(2)}, txid=${item.txidEsperado})`,
      );
    }

    console.log(
      `\nConcluido: ${baixados} amostras baixadas, ${naoEncontradosStorage} ausentes no Storage.`,
    );
  } finally {
    await app.delete().catch(() => {});
  }
}

function selecionarAmostraDiversa(
  candidatos: RegistroCandidatoAmostra[],
  limite: number,
): RegistroCandidatoAmostra[] {
  const ordenados = [...candidatos].sort((a, b) => {
    const pesoOrigemA = a.origemColecao === "pagamentos_pix" ? 0 : 1;
    const pesoOrigemB = b.origemColecao === "pagamentos_pix" ? 0 : 1;
    if (pesoOrigemA !== pesoOrigemB) return pesoOrigemA - pesoOrigemB;
    return (b.dataCriacaoIso || "").localeCompare(a.dataCriacaoIso || "");
  });

  // Prioriza diversidade de extensao + status + origem (ex: PDF pago, PNG pago, JPG pago, IN_ANALYSIS, bilhete)
  const escolhidos: RegistroCandidatoAmostra[] = [];
  const idsUsados = new Set<string>();
  const gruposVistos = new Set<string>();

  for (const item of ordenados) {
    if (escolhidos.length >= limite) break;
    const chaveGrupo = `${item.origemColecao}:${item.statusSistema}:${item.extensaoInferida}`;
    if (!gruposVistos.has(chaveGrupo)) {
      gruposVistos.add(chaveGrupo);
      idsUsados.add(item.caminhoObjetoNormalizado);
      escolhidos.push(item);
    }
  }

  for (const item of ordenados) {
    if (escolhidos.length >= limite) break;
    if (!idsUsados.has(item.caminhoObjetoNormalizado)) {
      idsUsados.add(item.caminhoObjetoNormalizado);
      escolhidos.push(item);
    }
  }

  return escolhidos;
}

async function baixarArquivoDeBuckets(
  storage: StorageLike,
  caminhoObjeto: string,
  bucketsTentativa: string[],
): Promise<{ buffer: Buffer | null; bucketUsado: string | null }> {
  const bucketsUnicos = Array.from(new Set(bucketsTentativa.filter(Boolean)));

  for (const nomeBucket of bucketsUnicos) {
    try {
      const arquivo = storage.bucket(nomeBucket).file(caminhoObjeto);
      const [existe] = await arquivo.exists();
      if (!existe) continue;
      const [buffer] = await arquivo.download();
      return { buffer, bucketUsado: nomeBucket };
    } catch {
      continue;
    }
  }

  return { buffer: null, bucketUsado: null };
}

main().catch((err) => {
  console.error("[coletar-producao] Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
