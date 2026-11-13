// ============================================================================
// ARQUIVO: scripts/ocr-sandbox/src/cli/rodarBenchmark.ts
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import { TesseractWorkerManager } from "../extractors/tesseractWorkerManager.js";
import { analisarComprovanteSandbox } from "../pipeline/analisarComprovanteSandbox.js";
import { CasoTesteAmostra } from "../types/ocrSandboxTypes.js";

const EXTENSOES_SUPORTADAS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".jfif"]);

interface LinhaRelatorioBenchmark {
  arquivo: string;
  perfil: "SHARP" | "BRUTO";
  modoExtracao: string;
  tempoMs: number;
  confiancaOcr: number | null;
  banco: string;
  txidLido: string | null;
  valorReais: string | null;
  e2eId: string | null;
  veredicto: string;
  score: number | null;
  alertas: string;
  bateuEsperado: string;
}

async function lerCasoOpcional(caminhoArquivo: string): Promise<CasoTesteAmostra | null> {
  const base = caminhoArquivo.replace(/\.[^.]+$/, "");
  const caminhoCaso = `${base}.caso.json`;

  try {
    const raw = await fs.readFile(caminhoCaso, "utf-8");
    return JSON.parse(raw) as CasoTesteAmostra;
  } catch {
    return null;
  }
}

async function listarArquivosAmostra(pastaAmostras: string): Promise<string[]> {
  try {
    const entradas = await fs.readdir(pastaAmostras, { withFileTypes: true });
    return entradas
      .filter((e) => e.isFile() && EXTENSOES_SUPORTADAS.has(path.extname(e.name).toLowerCase()))
      .map((e) => path.join(pastaAmostras, e.name))
      .sort();
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const raizSandbox = path.resolve(import.meta.dirname, "../..");
  const pastaAmostras = path.join(raizSandbox, "amostras");
  const pastaRelatorios = path.join(raizSandbox, "relatorios");

  await fs.mkdir(pastaAmostras, { recursive: true });
  const arquivos = await listarArquivosAmostra(pastaAmostras);

  if (arquivos.length === 0) {
    console.log(
      `Nenhum comprovante encontrado em '${pastaAmostras}'.\n` +
        "Adicione arquivos .pdf, .png, .jpg ou .webp (e opcionalmente <arquivo>.caso.json) para rodar o benchmark.",
    );
    return;
  }

  const perfis: Array<{ nome: "SHARP" | "BRUTO"; usarSharp: boolean }> = [
    { nome: "SHARP", usarSharp: true },
    { nome: "BRUTO", usarSharp: false },
  ];

  const linhasTabela: LinhaRelatorioBenchmark[] = [];

  for (const perfil of perfis) {
    const workerManager = new TesseractWorkerManager();
    try {
      for (const caminhoArquivo of arquivos) {
        const nomeArquivo = path.basename(caminhoArquivo);
        const buffer = await fs.readFile(caminhoArquivo);
        const caso = await lerCasoOpcional(caminhoArquivo);
        const res = await analisarComprovanteSandbox(
          buffer,
          { usarPreprocessamentoSharp: perfil.usarSharp, workerManager },
          caso?.pedido,
        );

        const veredictoObtido = res.correlacao?.veredicto ?? "SEM_CASO";
        const bateuEsperado =
          caso?.veredictoEsperado && res.correlacao
            ? caso.veredictoEsperado === res.correlacao.veredicto
              ? "OK"
              : `FALHA (${caso.veredictoEsperado})`
            : "-";

        linhasTabela.push({
          arquivo: nomeArquivo,
          perfil: perfil.nome,
          modoExtracao: res.extracao.modoExtracao,
          tempoMs: res.extracao.tempoMs,
          confiancaOcr: res.extracao.confiancaMediaOcr,
          banco: res.extraido.bancoDetectado,
          txidLido: res.extraido.txidLido,
          valorReais:
            res.extraido.valorCentavos !== null
              ? (res.extraido.valorCentavos / 100).toFixed(2)
              : null,
          e2eId: res.extraido.e2eId ? `${res.extraido.e2eId.slice(0, 14)}...` : null,
          veredicto: veredictoObtido,
          score: res.correlacao?.score ?? null,
          alertas: res.correlacao ? res.correlacao.alertas.join(",") : "",
          bateuEsperado,
        });
      }
    } finally {
      await workerManager.encerrar();
    }
  }

  console.log(`\n=== BENCHMARK OCR SANDBOX (${arquivos.length} amostras x 2 perfis) ===`);
  console.table(linhasTabela);

  await fs.mkdir(pastaRelatorios, { recursive: true });
  const caminhoRelatorio = path.join(
    pastaRelatorios,
    `benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await fs.writeFile(caminhoRelatorio, JSON.stringify(linhasTabela, null, 2), "utf-8");
  console.log(`\nRelatorio salvo em: ${caminhoRelatorio}`);
}

main().catch((err) => {
  console.error("[benchmark] Erro:", err);
  process.exit(1);
});
