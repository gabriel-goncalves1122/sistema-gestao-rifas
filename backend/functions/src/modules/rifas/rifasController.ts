// ============================================================================
// ARQUIVO: backend/functions/src/modules/rifas/rifasController.ts
// ============================================================================
import { corrigirDadosRifas } from "./controllers/corrigirDadosRifasController";
import { corrigirRecusadas } from "./controllers/corrigirRecusadasController";
import { desistirRecusadas } from "./controllers/desistirRecusadasController";
import { getMinhasRifas } from "./controllers/getMinhasRifasController";
import { obterHistoricoDetalhado } from "./controllers/obterHistoricoDetalhadoController";
import { obterMeuRelatorioVendas } from "./controllers/obterMeuRelatorioVendasController";
import { obterRelatorioTesouraria } from "./controllers/obterRelatorioTesourariaController";
import { processarVenda } from "./controllers/processarVendaController";

export const rifasController = {
  getMinhasRifas,
  obterMeuRelatorioVendas,
  processarVenda,
  obterRelatorioTesouraria,
  obterHistoricoDetalhado,
  corrigirRecusadas,
  corrigirDadosRifas,
  desistirRecusadas,
};
