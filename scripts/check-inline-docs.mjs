#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (
      file === "node_modules" ||
      file === "dist" ||
      file === "build" ||
      file === ".git" ||
      file.endsWith(".test.ts") ||
      file.endsWith(".test.tsx") ||
      file.endsWith(".spec.ts") ||
      file.endsWith(".d.ts")
    ) {
      continue;
    }
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const funcRegex =
    /(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z0-9_]+)|(?:const|let)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>|static\s+(?:async\s+)?([A-Za-z0-9_]+)\s*\()/g;

  const results = [];
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const fnName = match[1] || match[2] || match[3];
    if (!fnName) continue;

    const matchIndex = match.index;
    const textBefore = content.substring(Math.max(0, matchIndex - 500), matchIndex).trim();
    const hasJsDoc = textBefore.endsWith("*/");
    const lineNo = content.substring(0, matchIndex).split("\n").length;

    results.push({ name: fnName, line: lineNo, hasJsDoc });
  }

  return results;
}

function audit(dirs) {
  const allFiles = dirs.flatMap((d) => walk(path.join(rootDir, d)));
  let totalFuncs = 0;
  let withDoc = 0;
  let withoutDoc = 0;
  const missingByFile = [];

  for (const file of allFiles) {
    const res = analyzeFile(file);
    if (res.length === 0) continue;
    const missing = res.filter((r) => !r.hasJsDoc);
    totalFuncs += res.length;
    withDoc += res.length - missing.length;
    withoutDoc += missing.length;

    if (missing.length > 0) {
      missingByFile.push({
        file: path.relative(rootDir, file).replace(/\\/g, "/"),
        missing: missing.map((m) => `${m.name} (L${m.line})`),
        ratio: `${res.length - missing.length}/${res.length}`,
      });
    }
  }

  return { totalFuncs, withDoc, withoutDoc, missingByFile, totalFiles: allFiles.length };
}

console.log("=== RELATÓRIO DE COBERTURA DE DOCUMENTAÇÃO INLINE (TSDOC/JSDOC) ===\n");

const backendRes = audit(["backend/functions/src"]);
const frontendRes = audit(["frontend/src"]);

const percBackend = ((backendRes.withDoc / (backendRes.totalFuncs || 1)) * 100).toFixed(1);
const percFrontend = ((frontendRes.withDoc / (frontendRes.totalFuncs || 1)) * 100).toFixed(1);
const totalFuncs = backendRes.totalFuncs + frontendRes.totalFuncs;
const totalWithDoc = backendRes.withDoc + frontendRes.withDoc;
const percGlobal = ((totalWithDoc / (totalFuncs || 1)) * 100).toFixed(1);

console.log(`Backend:  ${backendRes.withDoc}/${backendRes.totalFuncs} funções documentadas (${percBackend}% coberto) em ${backendRes.totalFiles} arquivos`);
console.log(`Frontend: ${frontendRes.withDoc}/${frontendRes.totalFuncs} funções documentadas (${percFrontend}% coberto) em ${frontendRes.totalFiles} arquivos`);
console.log(`Global:   ${totalWithDoc}/${totalFuncs} funções documentadas (${percGlobal}% coberto)\n`);

const args = process.argv.slice(2);
const showMissing = args.includes("--verbose") || args.includes("-v");

if (showMissing) {
  console.log("--- Arquivos com funções pendentes de documentação (Backend) ---");
  for (const f of backendRes.missingByFile.slice(0, 10)) {
    console.log(`- ${f.file} [${f.ratio}]: ${f.missing.slice(0, 5).join(", ")}${f.missing.length > 5 ? "..." : ""}`);
  }
  console.log("\n--- Arquivos com funções pendentes de documentação (Frontend) ---");
  for (const f of frontendRes.missingByFile.slice(0, 10)) {
    console.log(`- ${f.file} [${f.ratio}]: ${f.missing.slice(0, 5).join(", ")}${f.missing.length > 5 ? "..." : ""}`);
  }
} else {
  console.log("Dica: execute com '--verbose' para listar os arquivos e funções não documentados.");
}
