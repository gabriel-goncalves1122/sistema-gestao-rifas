import { Request, Response, NextFunction } from "express";
import { auth, db } from "../config/firebaseAdmin";
import {
  AuthRequest,
  CARGOS_ADMIN,
  isUsuarioAdmin,
  obterSuperAdmins,
} from "./authMiddleware";
import * as sistemaService from "../../modules/sistema/sistemaService";

/**
 * Avalia se a rota requisitada deve ser isenta de bloqueio durante o modo de manutenção.
 * Rotas críticas como Webhooks de pagamento, autenticação, administração e leitura pública
 * de prêmios/status nunca são bloqueadas.
 *
 * @param {Request} req - Requisição Express.
 * @returns {boolean} Verdadeiro se a rota for isenta.
 */
export function isRotaIsentaManutencao(req: Request): boolean {
  const url = (req.originalUrl || req.url || req.path || "").toLowerCase();

  // 1. Consulta do status de manutenção
  if (url.includes("/sistema/manutencao")) {
    return true;
  }

  // 2. Rotas de autenticação (necessárias para o admin fazer login e validar sessão)
  if (url.includes("/auth")) {
    return true;
  }

  // 3. Rotas administrativas (permitem gerenciar o sistema e desligar a manutenção)
  if (url.includes("/admin")) {
    return true;
  }

  // 4. Webhooks de pagamento Pix (Mercado Pago não deve ser rejeitado para não perder confirmações)
  if (url.includes("/pix/webhook") || url.includes("/webhook")) {
    return true;
  }

  // 5. Consulta pública de prêmios (leitura GET sem impacto transacional)
  if (req.method === "GET" && url.includes("/premios")) {
    return true;
  }

  return false;
}

/**
 * Extrai o token de autenticação e verifica se a requisição provém de um administrador
 * ou super-admin válido, com suporte a custom claims, busca direta por UID, campo uid e busca por e-mail.
 *
 * @param {Request} req - Requisição Express.
 * @returns {Promise<boolean>} Verdadeiro se for um administrador autenticado.
 */
export async function isRequestDeAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return false;

  try {
    const decoded = await auth.verifyIdToken(token);
    (req as AuthRequest).user = decoded;

    const email = decoded.email?.toLowerCase().trim();

    // 1. Super-admin configurado via SUPER_ADMIN_EMAILS
    if (email && obterSuperAdmins().includes(email)) {
      return true;
    }

    // 2. Custom claim presente no próprio token do Firebase Auth
    const claimRole = (decoded as any).role || (decoded as any).cargo;
    if (claimRole && CARGOS_ADMIN.includes(claimRole)) {
      (req as AuthRequest).user = { ...decoded, role: claimRole };
      return true;
    }

    // 3. Busca no Firestore: por UID direto no ID do documento
    const userDoc = await db.collection("usuarios").doc(decoded.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const cargo = data?.cargo || data?.role;
      if (cargo && CARGOS_ADMIN.includes(cargo)) {
        (req as AuthRequest).user = { ...decoded, role: cargo };
        return true;
      }
    }

    // 4. Busca por campo uid == decoded.uid (quando o ID do documento é ex: ADERIDO_001)
    const uidSnap = await db
      .collection("usuarios")
      .where("uid", "==", decoded.uid)
      .limit(1)
      .get();
    if (!uidSnap.empty) {
      const data = uidSnap.docs[0].data();
      const cargo = data?.cargo || data?.role;
      if (cargo && CARGOS_ADMIN.includes(cargo)) {
        (req as AuthRequest).user = { ...decoded, role: cargo };
        return true;
      }
    }

    // 5. Busca por e-mail (exato e em minúsculas)
    if (decoded.email) {
      const emailSnap = await db
        .collection("usuarios")
        .where("email", "==", decoded.email)
        .limit(1)
        .get();
      if (!emailSnap.empty) {
        const data = emailSnap.docs[0].data();
        const cargo = data?.cargo || data?.role;
        if (cargo && CARGOS_ADMIN.includes(cargo)) {
          (req as AuthRequest).user = { ...decoded, role: cargo };
          return true;
        }
      }

      if (email && email !== decoded.email) {
        const emailLowerSnap = await db
          .collection("usuarios")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!emailLowerSnap.empty) {
          const data = emailLowerSnap.docs[0].data();
          const cargo = data?.cargo || data?.role;
          if (cargo && CARGOS_ADMIN.includes(cargo)) {
            (req as AuthRequest).user = { ...decoded, role: cargo };
            return true;
          }
        }
      }
    }

    return isUsuarioAdmin((req as AuthRequest).user);
  } catch {
    return false;
  }
}

/**
 * Middleware global de proteção contra tráfego operacional durante modo de manutenção.
 * Quando `emManutencao === true`, bloqueia acessos de usuários comuns e visitantes com HTTP 503,
 * liberando passagem para administradores autenticados e rotas isentas.
 *
 * @param {Request} req - Requisição Express.
 * @param {Response} res - Resposta Express.
 * @param {NextFunction} next - Callback do Express.
 * @returns {Promise<void>}
 */
export const manutencaoMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Se a rota for explicitamente isenta, libera imediatamente
  if (isRotaIsentaManutencao(req)) {
    next();
    return;
  }

  try {
    const status = await sistemaService.obterStatusManutencao();

    // Se o sistema não estiver em manutenção, segue normalmente
    if (!status.emManutencao) {
      next();
      return;
    }

    // Se houver token de autenticação pertencente a Administrador, libera o bypass
    const isAdmin = await isRequestDeAdmin(req);
    if (isAdmin) {
      next();
      return;
    }

    // Usuário comum ou anônimo acessando rota restrita durante manutenção
    res.status(503).json({
      error: "O sistema está temporariamente em manutenção programada.",
      code: "MANUTENCAO_ATIVA",
      manutencao: status,
    });
  } catch (error) {
    console.error("Erro no middleware de manutenção:", error);
    // Em caso de falha no Firestore ao consultar o status, não derruba a API: segue o fluxo
    next();
  }
};
