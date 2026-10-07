// ============================================================================
// ARQUIVO: backend/functions/src/index.ts
// ============================================================================

// Inicializa o Firebase Admin uma única vez para toda a API.
import "./shared/config/firebaseAdmin";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { onRequest } from "firebase-functions/v2/https";

import masterRouter from "./routes";
import { errorHandler } from "./shared/middlewares/errorHandler";

// ============================================================================
// CONFIGURAÇÃO DO EXPRESS
// ============================================================================

const app = express();
// Cloud Functions adiciona um proxy na frente do Express. Limitar a confianca
// a um salto evita aceitar uma cadeia X-Forwarded-For inteiramente forjada.
app.set("trust proxy", 1);

// ============================================================================
// SEGURANÇA — HEADERS HTTP
// ============================================================================

app.use(helmet());

// ============================================================================
// CORS DA API EXPRESS
// ============================================================================
// Esse CORS vale apenas para a Cloud Function /api.
// Ele não controla o CORS do Firestore Emulator, Auth Emulator ou Storage Emulator.
const criarCorsOptions = (req: express.Request): cors.CorsOptions => ({
  origin(origin, callback) {
    if (!origin) {
      // Quando o frontend acessa a API via Firebase Hosting rewrites (/api/...),
      // a requisição é same-origin e pode não ter o cabeçalho Origin.
      // Além disso, chamadas de webhook server-to-server também não possuem Origin.
      callback(null, true);
      return;
    }

    const origensPermitidas = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/,
      /^http:\/\/\[[0-9a-f:]+\]:\d+$/i,
      /^http:\/\/[a-z0-9.-]+\.local:\d+$/i,
      /^https:\/\/rifasaderidos2026\.web\.app$/,
      /^https:\/\/rifasaderidos2026\.firebaseapp\.com$/,
    ];

    if (process.env.ALLOWED_CORS_DOMAIN) {
      origensPermitidas.push(new RegExp(`^https:\\/\\/${process.env.ALLOWED_CORS_DOMAIN.replace(/\\./g, "\\.")}$`, 'i'));
    }

    const origemPermitida = origensPermitidas.some((regex) =>
      regex.test(origin),
    );

    if (origemPermitida) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origem bloqueada pelo CORS: ${origin}`));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "x-authenticity-token",
  ],

  credentials: true,
  optionsSuccessStatus: 204,
});

// Aplica CORS antes das rotas e do rate limiter para evitar bloqueio 429 sem cabecalhos CORS
app.use((req, res, next) => cors(criarCorsOptions(req))(req, res, next));

// Libera leitura de JSON e preserva o corpo bruto para validação de webhooks.
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString(
        "utf8",
      );
    },
  }),
);

// ============================================================================
// RATE LIMITING
// ============================================================================

const getIpRateLimitKey = (req: express.Request) =>
  ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpRateLimitKey,
  message: { error: "Muitas requisições. Tente novamente em instantes.", code: "RATE_LIMIT" },
});

app.use("/auth", rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpRateLimitKey,
  message: { error: "Muitas tentativas de autenticação. Aguarde.", code: "RATE_LIMIT" },
}));

app.use("/tesouraria/checkout/pix/webhook", rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpRateLimitKey,
  message: { error: "Muitas requisições de webhook.", code: "RATE_LIMIT" },
}));

app.use(apiLimiter);

// MOVED TO TOP

// ============================================================================
// ROTAS
// ============================================================================

const coreRouter = express.Router();

coreRouter.get("/status", (_req, res) => {
  res.json({
    status: "API da Comissão Online",
    timestamp: new Date().toISOString(),
  });
});

coreRouter.use("/", masterRouter);

app.use("/api", coreRouter);
app.use("/", coreRouter);

// ============================================================================
// MIDDLEWARE GLOBAL DE ERRO
// ============================================================================

app.use(errorHandler);

// ============================================================================
// CLOUD FUNCTIONS V2
// ============================================================================

export const api = onRequest(
  {
    region: "southamerica-east1",
    timeoutSeconds: 180,
    memory: "512MiB",
    invoker: "public",

    // O CORS fica centralizado no Express.
    cors: false,
  },
  app,
);

// ============================================================================
// AUTH TRIGGERS (v1 — coexiste com v2 sem problemas)
// ============================================================================

export { onCreateUserSetClaims } from "./modules/auth/authTriggers";

// ============================================================================
// CRONS (TAREFAS AGENDADAS)
// ============================================================================

export { limparPixExpirados } from "./modules/tesouraria/tesourariaCrons";
