import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const distIndex = path.join(frontendDir, "dist", "index.html");

const tsc = spawnSync("npx", ["tsc", "--noEmit"], {
  cwd: frontendDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

if (fs.existsSync(distIndex)) {
  fs.rmSync(distIndex, { force: true });
}

const vite = spawnSync("npx", ["vite", "build"], {
  cwd: frontendDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (vite.status === 0) {
  process.exit(0);
}

// Contorno para bug conhecido do libuv no Windows (UV_HANDLE_CLOSING / 3221226505)
// que ocorre após o Vite concluir e gravar todo o bundle em frontend/dist/.
if (process.platform === "win32" && fs.existsSync(distIndex)) {
  console.warn(
    "[build-frontend-safe] Vite concluiu o bundle em frontend/dist, mas encerrou com erro de libuv no Windows. Prosseguindo.",
  );
  process.exit(0);
}

process.exit(vite.status ?? 1);
