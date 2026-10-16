import { Box } from "@mui/material";

import { EstatisticasAderido } from "../../EstatisticasAderido";
import { AbaRecusadas } from "../../AbaRecusadas";
import { CarrinhoFlutuante } from "../../CarrinhoFlutuante";
import { AderidosSwipeTransition } from "../shared/AderidosSwipeTransition";
import { PainelRifasPrincipal } from "../shared/PainelRifasPrincipal";
import { painelAderidoStyles } from "../../styles/painelAderidoStyles";
import type { GrupoRifasRecusadas, FiltroRifasAderido, RifaAderido, VisaoPainelAderido } from "../../types/painelAderido";
import type { ContadoresRifas } from "../../utils/filtrosRifas";

interface MinhasRifasDesktopViewProps {
  visaoAtual: VisaoPainelAderido;
  primeiroNome: string;
  valorArrecadado: number;
  contadoresRifas: ContadoresRifas;
  notificacoesNaoLidas: number;
  totalPendencias: number;
  onAbrirNotificacoes: () => void;
  onAbrirRecusadas: () => void;
  filtro: FiltroRifasAderido;
  onChangeFiltro: (filtro: FiltroRifasAderido) => void;
  rifasFiltradas: RifaAderido[];
  selecionadas: string[];
  onToggleSelecao: (numero: string, status: string) => void;
  onAbrirDetalhes: (rifa: RifaAderido) => void;
  gruposRecusados: GrupoRifasRecusadas[];
  onVoltar: () => void;
  onAbrirCorrecao: (grupo: GrupoRifasRecusadas) => void;
  possuiSelecao: boolean;
  valorTotalSelecionado: number;
  onVenderClick: () => void;
  onLimparSelecao?: () => void;
}

export function MinhasRifasDesktopView({
  visaoAtual,
  primeiroNome,
  valorArrecadado,
  contadoresRifas,
  notificacoesNaoLidas,
  totalPendencias,
  onAbrirNotificacoes,
  onAbrirRecusadas,
  filtro,
  onChangeFiltro,
  rifasFiltradas,
  selecionadas,
  onToggleSelecao,
  onAbrirDetalhes,
  gruposRecusados,
  onVoltar,
  onAbrirCorrecao,
  possuiSelecao,
  valorTotalSelecionado,
  onVenderClick,
  onLimparSelecao,
}: MinhasRifasDesktopViewProps) {
  return (
    <AderidosSwipeTransition visaoAtual={visaoAtual}>
      {visaoAtual === "recusadas" ? (
        <Box sx={painelAderidoStyles.root}>
          <AbaRecusadas
            gruposRecusados={gruposRecusados}
            onVoltar={onVoltar}
            onAbrirCorrecao={onAbrirCorrecao}
          />
        </Box>
      ) : (
        <Box sx={painelAderidoStyles.root}>
          <EstatisticasAderido
            primeiroNome={primeiroNome}
            valorArrecadado={valorArrecadado}
            notificacoesNaoLidas={notificacoesNaoLidas}
            totalPendencias={totalPendencias}
            onAbrirNotificacoes={onAbrirNotificacoes}
            onAbrirRecusadas={onAbrirRecusadas}
          />

          <PainelRifasPrincipal
            filtro={filtro}
            onChangeFiltro={onChangeFiltro}
            rifasFiltradas={rifasFiltradas}
            contadoresRifas={contadoresRifas}
            selecionadas={selecionadas}
            onToggleSelecao={onToggleSelecao}
            onAbrirDetalhes={onAbrirDetalhes}
          />

          {possuiSelecao && (
            <CarrinhoFlutuante
              quantidade={selecionadas.length}
              valorTotal={valorTotalSelecionado}
              onVenderClick={onVenderClick}
              numerosSelecionados={selecionadas}
              onLimparClick={onLimparSelecao}
            />
          )}
        </Box>
      )}
    </AderidosSwipeTransition>
  );
}
