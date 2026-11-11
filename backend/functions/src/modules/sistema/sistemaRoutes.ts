import { Router } from "express";
import { sistemaController } from "./sistemaController";

const router = Router();

// Rota pública para consulta do status de manutenção
// Exemplo final: GET /sistema/manutencao
router.get("/manutencao", sistemaController.obterManutencao);

export default router;
