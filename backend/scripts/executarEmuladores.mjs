import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import fs from "node:fs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(scriptsDir, "../functions");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const usaGrupoDeProcesso = process.platform !== "win32";

const jdk21Padrao = "C:\\Program Files\\Microsoft\\jdk-21.0.12.101-hotspot";
const javaOverride =
  process.platform === "win32" && fs.existsSync(jdk21Padrao)
    ? {
        JAVA_HOME: jdk21Padrao,
        PATH: `${path.join(jdk21Padrao, "bin")};${process.env.PATH || ""}`,
      }
    : {};

function iniciarScript(nome) {
  return spawn(npmCommand, ["run", nome], {
    cwd: functionsDir,
    detached: usaGrupoDeProcesso,
    env: {
      ...process.env,
      ...javaOverride,
      CHOKIDAR_USEPOLLING: "true",
      CHOKIDAR_INTERVAL: "800",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });
}

function enviarSinal(processo, sinal) {
  if (!processo.pid || processo.exitCode !== null) return;

  try {
    // Grupos isolados impedem que o terminal e este coordenador entreguem o
    // mesmo SIGINT duas vezes durante a exportacao do Firebase.
    process.kill(usaGrupoDeProcesso ? -processo.pid : processo.pid, sinal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

const typescript = iniciarScript("build:watch");
const firebase = iniciarScript("emulators:start");

let encerrando = false;
let firebaseFinalizado = false;
let typescriptFinalizado = false;
let codigoFirebase = 0;
let codigoTypescript = 0;

function finalizarSePossivel() {
  if (!firebaseFinalizado || !typescriptFinalizado) return;
  process.exitCode = codigoFirebase || codigoTypescript;
}

function encerrarComSeguranca() {
  if (encerrando) {
    console.warn("[Emuladores] Segundo sinal recebido; encerrando imediatamente.");
    enviarSinal(firebase, "SIGKILL");
    enviarSinal(typescript, "SIGKILL");
    return;
  }

  encerrando = true;
  console.log("\n[Emuladores] Aguardando exportacao e encerramento do Firebase...");
  enviarSinal(firebase, "SIGINT");

  const forcarAposTimeout = setTimeout(() => {
    console.error("[Emuladores] Encerramento excedeu 60s; finalizando processos.");
    enviarSinal(firebase, "SIGKILL");
    enviarSinal(typescript, "SIGKILL");
  }, 60_000);
  forcarAposTimeout.unref();
}

for (const sinal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sinal, encerrarComSeguranca);
}

firebase.on("exit", (codigo, sinal) => {
  firebaseFinalizado = true;
  codigoFirebase = encerrando ? 0 : codigo ?? (sinal ? 1 : 0);

  // O watcher so termina depois do Firebase, para nao interromper a exportacao.
  enviarSinal(typescript, "SIGTERM");
  finalizarSePossivel();
});

typescript.on("exit", (codigo, sinal) => {
  typescriptFinalizado = true;
  codigoTypescript = encerrando ? 0 : codigo ?? (sinal ? 1 : 0);

  if (!encerrando && !firebaseFinalizado) {
    console.error("[Emuladores] TypeScript watch terminou inesperadamente.");
    encerrarComSeguranca();
  }

  finalizarSePossivel();
});

firebase.on("error", (error) => {
  console.error("[Emuladores] Falha ao iniciar Firebase:", error.message);
  encerrarComSeguranca();
});

typescript.on("error", (error) => {
  console.error("[Emuladores] Falha ao iniciar TypeScript:", error.message);
  encerrarComSeguranca();
});
