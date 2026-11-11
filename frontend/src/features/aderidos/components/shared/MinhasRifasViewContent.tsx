import { Box } from "@mui/material";

import { EstatisticasAderido } from "../../EstatisticasAderido";
import { AbaRecusadas } from "../../AbaRecusadas";
import { CarrinhoFlutuante } from "../../CarrinhoFlutuante";
import { AderidosSwipeTransition } from "./AderidosSwipeTransition";
import { PainelRifasPrincipal } from "./PainelRifasPrincipal";
import { painelAderidoStyles } from "../../styles/painelAderidoStyles";
import type {
  FiltroRifasAderido,
  GrupoRifasRecusadas,
  RifaAderido,
  VisaoPainelAderido,
} from "../../types/painelAderido";
import type { ContadoresRifas } from "../../utils/filtrosRifas";

/**
 * Propriedades compartilhadas de renderização da visão do painel de rifas do aderido.
 */
export interface MinhasRifasViewProps {
  /** Visão ativa no painel ("geral" ou "recusadas"). */
  visaoAtual: VisaoPainelAderido;
  /** Primeiro nome do aderido logado. */
  primeiroNome: string;
  /** Valor total já arrecadado pelo aderido. */
  valorArrecadado: number;
  /** Contadores agregados por status de rifa. */
  contadoresRifas: ContadoresRifas;
  /** Total de notificações não lidas. */
  notificacoesNaoLidas: number;
  /** Total de vendas com pendências/recusas. */
  totalPendencias: number;
  /** Callback para abrir o drawer de notificações. */
  onAbrirNotificacoes: () => void;
  /** Callback para alternar para a aba de vendas recusadas. */
  onAbrirRecusadas: () => void;
  /** Callback opcional para exportar relatório de vendas em PDF. */
  onExportarRelatorio?: () => void;
  /** Flag de carregamento durante geração do relatório. */
  exportandoRelatorio?: boolean;
  /** Filtro de status selecionado para as rifas. */
  filtro: FiltroRifasAderido;
  /** Callback para alterar o filtro ativo. */
  onChangeFiltro: (filtro: FiltroRifasAderido) => void;
  /** Lista de rifas filtradas para exibição. */
  rifasFiltradas: RifaAderido[];
  /** Números das rifas atualmente selecionadas para venda. */
  selecionadas: string[];
  /** Callback para alternar seleção de uma rifa. */
  onToggleSelecao: (numero: string, status: string) => void;
  /** Callback para abrir os detalhes de uma rifa selecionada. */
  onAbrirDetalhes: (rifa: RifaAderido) => void;
  /** Grupos de vendas recusadas exibidos na aba de correção. */
  gruposRecusados: GrupoRifasRecusadas[];
  /** Callback para retornar à visão principal do painel. */
  onVoltar: () => void;
  /** Callback para abrir o fluxo de correção de uma venda recusada. */
  onAbrirCorrecao: (grupo: GrupoRifasRecusadas) => void;
  /** Callback opcional para desistir de uma venda recusada. */
  onDesistirVenda?: (numerosRifas: string[]) => Promise<boolean | void> | void;
  /** Indica se há pelo menos uma rifa selecionada no carrinho. */
  possuiSelecao: boolean;
  /** Valor total calculado para as rifas selecionadas. */
  valorTotalSelecionado: number;
  /** Callback acionado ao avançar para a venda das rifas selecionadas. */
  onVenderClick: () => void;
  /** Callback opcional para limpar a seleção atual. */
  onLimparSelecao?: () => void;
}

/**
 * Conteúdo compartilhado do painel de rifas do aderido (estatísticas, listagem e aba de recusadas).
 *
 * @param {MinhasRifasViewProps} props - Estado e callbacks orquestrados pelo controller do painel.
 * @returns {JSX.Element} Conteúdo principal encapsulado na transição de abas.
 */
export function MinhasRifasViewContent({
  visaoAtual,
  primeiroNome,
  valorArrecadado,
  contadoresRifas,
  notificacoesNaoLidas,
  totalPendencias,
  onAbrirNotificacoes,
  onAbrirRecusadas,
  onExportarRelatorio,
  exportandoRelatorio,
  filtro,
  onChangeFiltro,
  rifasFiltradas,
  selecionadas,
  onToggleSelecao,
  onAbrirDetalhes,
  gruposRecusados,
  onVoltar,
  onAbrirCorrecao,
  onDesistirVenda,
  possuiSelecao,
  valorTotalSelecionado,
  onVenderClick,
}: MinhasRifasViewProps) {
  return (
    <AderidosSwipeTransition visaoAtual={visaoAtual}>
      {visaoAtual === "recusadas" ? (
        <Box sx={painelAderidoStyles.root}>
          <AbaRecusadas
            gruposRecusados={gruposRecusados}
            onVoltar={onVoltar}
            onAbrirCorrecao={onAbrirCorrecao}
            onDesistirVenda={onDesistirVenda}
          />
        </Box>
      ) : (
        <Box sx={painelAderidoStyles.root}>
          <EstatisticasAderido
            primeiroNome={primeiroNome}
            valorArrecadado={valorArrecadado}
            totalRifas={contadoresRifas.todas}
            rifasPagas={contadoresRifas.pago}
            notificacoesNaoLidas={notificacoesNaoLidas}
            totalPendencias={totalPendencias}
            onAbrirNotificacoes={onAbrirNotificacoes}
            onAbrirRecusadas={onAbrirRecusadas}
            onExportarRelatorio={onExportarRelatorio}
            exportandoRelatorio={exportandoRelatorio}
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
              onPagarClick={onVenderClick}
              onVenderClick={onVenderClick}
              numerosSelecionados={selecionadas}
            />
          )}
        </Box>
      )}
    </AderidosSwipeTransition>
  );
}
