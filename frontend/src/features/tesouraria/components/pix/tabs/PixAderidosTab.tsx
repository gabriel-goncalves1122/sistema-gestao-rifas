import { useMemo, useState } from "react";
import { Box } from "@mui/material";

import { PixTransacao } from "../../../types/pixTransacoes";
import { AderidoMetricaDesempenho } from "../../../types/desempenho";
import {
  agruparPixAderidos,
  adaptarAderidosDoRelatorio,
  PixAderidoResumo,
} from "../../../utils/pixAderidosUtils";
import { PixAderidoDetalhesDrawer } from "./aderidos/PixAderidoDetalhesDrawer";
import { PixAderidoResumoCard } from "./aderidos/PixAderidoResumoCard";
import { layout } from "../../../styles/layout";

/**
 * Propriedades para renderização da aba de Aderidos na tesouraria.
 */
export interface PixAderidosTabProps {
  /** Transações Pix locais para vinculação ao abrir detalhes */
  transacoes: PixTransacao[];
  /** Dados consolidados de aderidos vindos do relatório do servidor (opcional) */
  aderidosServidor?: AderidoMetricaDesempenho[];
}

/**
 * Aba de visualização consolidada do desempenho dos Aderidos (vendedores).
 * Prioriza dados agregados pelo backend (/tesouraria/relatorio) contendo vendas Pix e manuais,
 * com fallback transparente para agrupamento local baseado nas transações carregadas.
 *
 * @param {PixAderidosTabProps} props - Propriedades do componente.
 * @returns {JSX.Element} Grid com cartões de aderidos e drawer de detalhes.
 */
export function PixAderidosTab({
  transacoes,
  aderidosServidor,
}: PixAderidosTabProps) {
  const [aderidoSelecionado, setAderidoSelecionado] =
    useState<PixAderidoResumo | null>(null);

  const resumoPorAderido = useMemo(() => {
    if (aderidosServidor && aderidosServidor.length > 0) {
      return adaptarAderidosDoRelatorio(aderidosServidor, transacoes);
    }
    return agruparPixAderidos(transacoes);
  }, [aderidosServidor, transacoes]);

  const fecharDetalhes = () => setAderidoSelecionado(null);

  return (
    <>
      <Box sx={layout.cardsGrid}>
        {resumoPorAderido.map((aderido) => (
          <PixAderidoResumoCard
            key={aderido.chave}
            aderido={aderido}
            onSelecionar={setAderidoSelecionado}
          />
        ))}
      </Box>

      <PixAderidoDetalhesDrawer
        aderido={aderidoSelecionado}
        onClose={fecharDetalhes}
      />
    </>
  );
}
