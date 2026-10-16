import { Box, CircularProgress } from "@mui/material";

import { DesempenhoDesktopView } from "../components/desempenho/desktop/DesempenhoDesktopView";
import { DesempenhoMobileView } from "../components/desempenho/mobile/DesempenhoMobileView";
import { useDesempenhoController } from "../hooks/useDesempenhoController";
import { useTesourariaLayout } from "../hooks/useTesourariaLayout";

export function DesempenhoPage() {
  const {
    dados,
    rankingFiltrado,
    buscaRanking,
    setBuscaRanking,
    carregando,
  } = useDesempenhoController();
  const { isMobile } = useTesourariaLayout();

  if (carregando) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return isMobile ? (
    <DesempenhoMobileView
      dados={dados}
      rankingFiltrado={rankingFiltrado}
      buscaRanking={buscaRanking}
      onBuscaRankingChange={setBuscaRanking}
    />
  ) : (
    <DesempenhoDesktopView
      dados={dados}
      rankingFiltrado={rankingFiltrado}
      buscaRanking={buscaRanking}
      onBuscaRankingChange={setBuscaRanking}
    />
  );
}
