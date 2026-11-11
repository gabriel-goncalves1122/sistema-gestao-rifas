// ============================================================================
// ARQUIVO: backend/functions/src/routes.ts
// ============================================================================
import { Router } from "express";

// Importa os mini-roteadores de cada domínio
import authRoutes from "./modules/auth/authRoutes";
import rifasRoutes from "./modules/rifas/rifasRoutes";
import auditoriaRoutes from "./modules/auditoria/auditoriaRoutes";
import premiosRoutes from "./modules/premios/premiosRoutes";
import notificacoesRoutes from "./modules/notificacoes/notificacoesRoutes";
import adminRoutes from "./modules/admin/adminRoutes";
import tesourariaRoutes from "./modules/tesouraria/tesourariaRoutes";
import sistemaRoutes from "./modules/sistema/sistemaRoutes";
import { manutencaoMiddleware } from "./shared/middlewares/manutencaoMiddleware";

const router = Router();

// ============================================================================
// DELEGAÇÃO DE ROTAS (Redirecionamento)
// ============================================================================

// Rotas do sistema (ex: status público de manutenção)
router.use("/sistema", sistemaRoutes);

// Middleware global de manutenção: intercepta requisições comuns durante manutenção
router.use(manutencaoMiddleware);

router.use("/auth", authRoutes);
router.use("/rifas", rifasRoutes);
router.use("/tesouraria", tesourariaRoutes);
router.use("/auditorias", auditoriaRoutes);
router.use("/premios", premiosRoutes);
router.use("/notificacoes", notificacoesRoutes);
router.use("/admin", adminRoutes);

export default router;
