// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/cli/analisarArquivo.ts
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import { TesseractWorkerManager } from "../extractors/tesseractWorkerManager.js";
import { analisarComprovanteSandbox } from "../pipeline/analisarComprovanteSandbox.js";
import { PedidoEsperadoCorrelacao } from "../types/ocrSandboxTypes.js";

function parseArgs(argv: string[]): {
  arquivo: string;
  txid?: string;
  valorReais?: number;
  recebedor?: string;
  bruto: boolean;
} {
  const args = argv.slice(2);
  let arquivo = "";
  let txid: string | undefined;
  let valorReais: number | undefined;
  let recebedor: string | undefined;
  let bruto = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--txid" && args[i + 1]) {
      txid = args[++i];
    } else if (arg === "--valor" && args[i + 1]) {
      valorReais = Number.parseFloat(args[++i].replace(",", "."));
    } else if (arg === "--recebedor" && args[i + 1]) {
      recebedor = args[++i];
    } else if (arg === "--bruto") {
      bruto = true;
    } else if (!arg.startsWith("--") && !arquivo) {
      arquivo = arg;
    }
  }

  if (!arquivo) {
    throw new Error(
      "Uso: npm run analyze -- <caminho-do-arquivo> [--txid RIFA...] [--valor 30.00] [--recebedor NOME] [--bruto]",
    );
  }

  return { arquivo, txid, valorReais, recebedor, bruto };
}

async function main(): Promise<void> {
  const opcoes = parseArgs(process.argv);
  const caminhoAbsoluto = path.resolve(process.cwd(), opcoes.arquivo);
  const buffer = await fs.readFile(caminhoAbsoluto);
  const workerManager = new TesseractWorkerManager();

  const pedido: PedidoEsperadoCorrelacao | undefined =
    opcoes.txid && opcoes.valorReais && Number.isFinite(opcoes.valorReais)
      ? {
          pagamentoId: "cli-manual",
          txidEsperado: opcoes.txid,
          valorCentavos: Math.round(opcoes.valorReais * 100),
          recebedorEsperado: opcoes.recebedor,
        }
      : undefined;

  try {
    const resultado = await analisarComprovanteSandbox(
      buffer,
      {
        usarPreprocessamentoSharp: !opcoes.bruto,
        workerManager,
      },
      pedido,
    );

    console.log("\n=== EXTRACAO ===");
    console.log({
      tipoArquivo: resultado.extracao.tipoArquivo,
      modoExtracao: resultado.extracao.modoExtracao,
      tempoMs: resultado.extracao.tempoMs,
      confiancaMediaOcr: resultado.extracao.confiancaMediaOcr,
      memoriaDeltaMb: resultado.extracao.memoriaDeltaMb,
      pdfEscaneado: resultado.extracao.pdfEscaneado,
    });

    console.log("\n=== CAMPOS PIX DETECTADOS ===");
    console.log(resultado.extraido);

    if (resultado.correlacao) {
      console.log("\n=== CORRELACAO ===");
      console.log({
        veredicto: resultado.correlacao.veredicto,
        score: resultado.correlacao.score,
        txidBate: resultado.correlacao.txidBate,
        valorBate: resultado.correlacao.valorBate,
        recebedorBate: resultado.correlacao.recebedorBate,
        e2eUnico: resultado.correlacao.e2eUnico,
        alertas: resultado.correlacao.alertas,
        motivos: resultado.correlacao.motivos,
      });
    }

    console.log("\n=== TEXTO BRUTO (PRIMEIROS 800 CHARS) ===");
    console.log(resultado.extracao.textoBruto.slice(0, 800));
  } finally {
    await workerManager.encerrar();
  }
}

main().catch((err) => {
  console.error("[analyze] Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
