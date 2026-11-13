// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/utils/calcularMetricasConsolidadasAderido.ts
// ============================================================================
import type {
  FiltroRifasAderido,
  GrupoRifasRecusadas,
  RifaAderido,
} from "../types/painelAderido";
import { VALOR_RIFA } from "./constants";
import type { ContadoresRifas } from "./filtrosRifas";

export interface MetricasConsolidadasAderido {
  valorArrecadado: number;
  contadoresRifas: ContadoresRifas;
  gruposRecusados: GrupoRifasRecusadas[];
}

function criarContadoresIniciais(): ContadoresRifas {
  return {
    todas: 0,
    disponivel: 0,
    reservado: 0,
    pendente: 0,
    pago: 0,
    recusado: 0,
  };
}

/**
 * Executa uma passada única O(N) sobre o array de rifas do aderido, consolidando:
 * 1. Valor total arrecadado (apenas rifas com status === "pago")
 * 2. Contadores segmentados por categoria de status para os chips de filtro
 * 3. Agrupamento de rifas recusadas / pendentes de correção cadastral
 *
 * Elimina o custo de 3 iterações separadas e reduz alocações temporárias na thread principal.
 *
 * @param {RifaAderido[]} rifas - Lista completa de bilhetes do aderido logado.
 * @returns {MetricasConsolidadasAderido} Objeto com valor, contadores e grupos recusados.
 */
export function calcularMetricasConsolidadasAderido(
  rifas: RifaAderido[],
): MetricasConsolidadasAderido {
  const contadores = criarContadoresIniciais();
  const gruposRecusadosMap: Record<string, GrupoRifasRecusadas> = {};
  let totalPagas = 0;

  for (let i = 0; i < rifas.length; i++) {
    const rifa = rifas[i];
    contadores.todas += 1;

    const status = rifa.status as FiltroRifasAderido;
    if (status && status in contadores) {
      contadores[status] += 1;
    }

    if (status === "pago") {
      totalPagas += 1;
    }

    const precisaCorrecao =
      rifa.status === "recusado" || rifa.correcao_pendente === true;

    if (precisaCorrecao) {
      const dataBase = rifa.data_reserva
        ? rifa.data_reserva.split("T")[0]
        : "sem-data";

      let chaveTransacao = "";
      if (rifa.pix_order_id) {
        chaveTransacao = `pix-${rifa.pix_order_id}`;
      } else if (rifa.comprovante_url) {
        chaveTransacao = `comprovante-${rifa.comprovante_url}`;
      } else if (rifa.comprador_id) {
        chaveTransacao = `comprador-${rifa.comprador_id}`;
      } else {
        const comprador = rifa.comprador_nome || "sem-comprador";
        chaveTransacao = `manual-${comprador}-${dataBase}-${rifa.status}`;
      }

      const chaveGrupo = `${chaveTransacao}-${rifa.motivo_recusa}`;

      if (!gruposRecusadosMap[chaveGrupo]) {
        gruposRecusadosMap[chaveGrupo] = {
          comprador: rifa.comprador_nome || "Desconhecido",
          email: rifa.comprador_email || "",
          telefone: rifa.comprador_telefone || "",
          data: rifa.data_reserva || null,
          motivo: rifa.motivo_recusa || "Sem motivo informado",
          bilhetes: [],
          ...(rifa.status === "pago" && rifa.correcao_pendente === true
            ? { apenasCorrecaoCadastro: true }
            : {}),
        };
      }

      gruposRecusadosMap[chaveGrupo].bilhetes.push(rifa.numero);
    }
  }

  return {
    valorArrecadado: totalPagas * VALOR_RIFA,
    contadoresRifas: contadores,
    gruposRecusados: Object.values(gruposRecusadosMap),
  };
}
