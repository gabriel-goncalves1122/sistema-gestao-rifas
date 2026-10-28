import { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { PixTransacao } from "../../../types/pixTransacoes";
import { AderidoMetricaDesempenho } from "../../../types/desempenho";
import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";
import {
  agruparPixAderidos,
  adaptarAderidosDoRelatorio,
  PixAderidoResumo,
} from "../../../utils/pixAderidosUtils";
import { DesempenhoRankingTable } from "../../desempenho/desktop/DesempenhoRankingTable";
import { DesempenhoRankingCardList } from "../../desempenho/mobile/DesempenhoRankingCardList";
import { PixAderidoDetalhesDrawer } from "./aderidos/PixAderidoDetalhesDrawer";

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
 * Aba de visualização consolidada do desempenho e histórico individual dos Aderidos (vendedores).
 * Exibe a tabela completa de ranking (no desktop) ou lista de cartões (no mobile) com busca rápida,
 * abrindo o histórico de transações da pessoa selecionada ao clicar em seu nome/linha.
 *
 * @param {PixAderidosTabProps} props - Propriedades do componente.
 * @returns {JSX.Element} Ranking interativo de aderidos e drawer de histórico de transações.
 */
export function PixAderidosTab({
  transacoes,
  aderidosServidor,
}: PixAderidosTabProps) {
  const { isMobile } = useTesourariaLayout();
  const [buscaRanking, setBuscaRanking] = useState("");
  const [aderidoSelecionado, setAderidoSelecionado] =
    useState<PixAderidoResumo | null>(null);

  const resumoPorAderido = useMemo(() => {
    if (aderidosServidor && aderidosServidor.length > 0) {
      return adaptarAderidosDoRelatorio(aderidosServidor, transacoes);
    }
    return agruparPixAderidos(transacoes);
  }, [aderidosServidor, transacoes]);

  const aderidosFiltrados = useMemo(() => {
    const termo = buscaRanking.trim().toLowerCase();
    if (!termo) return resumoPorAderido;

    return resumoPorAderido.filter((item) => {
      const campos = [
        item.nome,
        item.cpf,
        item.cpfLabel,
        item.curso,
        item.cargo,
      ];
      return campos.some((campo) =>
        String(campo || "").toLowerCase().includes(termo),
      );
    });
  }, [resumoPorAderido, buscaRanking]);

  const fecharDetalhes = () => setAderidoSelecionado(null);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            sx={{
              ...typography.sectionTitle,
              color: colors.pretoEsverdeado,
              fontSize: { xs: "1.08rem", sm: "1.22rem" },
              fontWeight: 900,
            }}
          >
            Ranking de Arrecadação por Aderido
          </Typography>
          <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.84rem" }}>
            Clique em qualquer aderido para visualizar o histórico de transações daquela pessoa.
          </Typography>
        </Box>

        <TextField
          size="small"
          placeholder="Buscar por nome, curso ou CPF..."
          value={buscaRanking}
          onChange={(e) => setBuscaRanking(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.cinzaIcone, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: { xs: "100%", sm: 280 },
            bgcolor: colors.branco,
            borderRadius: 2,
          }}
        />
      </Stack>

      {isMobile ? (
        <DesempenhoRankingCardList
          ranking={aderidosFiltrados}
          onSelecionarAderido={setAderidoSelecionado}
        />
      ) : (
        <DesempenhoRankingTable
          ranking={aderidosFiltrados}
          onSelecionarAderido={setAderidoSelecionado}
        />
      )}

      <PixAderidoDetalhesDrawer
        aderido={aderidoSelecionado}
        onClose={fecharDetalhes}
      />
    </Box>
  );
}
