// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/GrelhaRifas.tsx
// ============================================================================
import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, ButtonBase, Tooltip, useMediaQuery } from "@mui/material";
import { motion } from "framer-motion";

import { painelAderidoStyles } from "../styles/painelAderidoStyles";
import { RifaAderido } from "../types/painelAderido";
import { obterConfigStatusRifa } from "../utils/rifasStatus";
import { EmptyRifasState } from "./EmptyRifasState";
import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades para renderização da grelha de números de rifa.
 */
export interface GrelhaRifasProps {
  /** Lista de rifas a exibir na grelha */
  rifas: RifaAderido[];
  /** Array com os números das rifas atualmente selecionadas */
  selecionadas: string[];
  /** Callback para alternar (adicionar ou remover) a seleção de uma rifa */
  onToggleSelecao: (numero: string, status: string) => void;
  /** Callback para abrir o modal de detalhes de uma rifa paga */
  onAbrirDetalhes: (rifa: RifaAderido) => void;
}

function montarEstiloRifa(
  rifa: RifaAderido,
  isSelecionada: boolean,
  podeClicar: boolean,
) {
  const config = obterConfigStatusRifa(rifa.status);

  if (isSelecionada) {
    return {
      bgcolor: colors.verdeEscuro,
      color: colors.branco,
      borderColor: colors.verdeEscuro,
      boxShadow:
        "0 14px 28px rgba(6, 61, 49, 0.20), 0 2px 6px rgba(2, 27, 22, 0.10)",

      "&:hover": {
        bgcolor: colors.pretoEsverdeado,
        borderColor: colors.pretoEsverdeado,
        transform: "translateY(-1px)",
        boxShadow:
          "0 18px 34px rgba(6, 61, 49, 0.25), 0 4px 10px rgba(2, 27, 22, 0.12)",
      },

      "&.Mui-disabled": {
        color: colors.branco,
        opacity: 1,
      },
    };
  }

  const temCorrecaoPendente = rifa.correcao_pendente === true;

  return {
    bgcolor: config.bg,
    color: config.color,
    borderColor: temCorrecaoPendente ? "#CBA64D" : config.border,
    boxShadow:
      "0 8px 18px rgba(2, 27, 22, 0.055), 0 1px 3px rgba(6, 61, 49, 0.045)",

    "&:hover": {
      bgcolor: config.hoverBg,
      borderColor: temCorrecaoPendente
        ? "#B45309"
        : podeClicar
          ? "#8DBEAD"
          : config.border,
      transform: podeClicar ? "translateY(-1px)" : "none",
      boxShadow: podeClicar
        ? "0 14px 28px rgba(2, 27, 22, 0.10), 0 2px 8px rgba(6, 61, 49, 0.07)"
        : "0 10px 22px rgba(2, 27, 22, 0.07)",
    },

    "&.Mui-disabled": {
      color: config.color,
      opacity: 1,
    },
  };
}

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.01 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.15 } },
};

interface RifaItemProps {
  rifa: RifaAderido;
  isSelecionada: boolean;
  onToggleSelecao: (numero: string, status: string) => void;
  onAbrirDetalhes: (rifa: RifaAderido) => void;
  animar: boolean;
}

const RifaItem = React.memo(function RifaItem({
  rifa,
  isSelecionada,
  onToggleSelecao,
  onAbrirDetalhes,
  animar,
}: RifaItemProps) {
  const config = obterConfigStatusRifa(rifa.status);
  const podeClicar = isSelecionada || config.selecionavel || config.abreDetalhes;
  const temCorrecaoPendente = rifa.correcao_pendente === true;
  const tooltip = isSelecionada
    ? "Clique para desmarcar"
    : config.selecionavel
      ? "Clique para vender"
      : config.abreDetalhes
        ? temCorrecaoPendente
          ? "Clique para ver detalhes (correção pendente)"
          : "Clique para ver detalhes"
        : "";
  const ariaLabel = isSelecionada
    ? `Rifa ${rifa.numero} selecionada, clique para desmarcar`
    : config.selecionavel
      ? `Rifa ${rifa.numero} disponível para vender`
      : config.abreDetalhes
        ? `Rifa ${rifa.numero} paga, clique para ver detalhes`
        : `Rifa ${rifa.numero} - ${config.label}`;

  const handleClick = () => {
    if (isSelecionada || config.selecionavel) {
      onToggleSelecao(rifa.numero, rifa.status);
      return;
    }
    if (config.abreDetalhes) {
      onAbrirDetalhes(rifa);
    }
  };

  const botaoRifa = (
    <ButtonBase
      data-testid={`rifa-${rifa.numero}`}
      onClick={podeClicar ? handleClick : undefined}
      disabled={!podeClicar}
      aria-label={ariaLabel}
      aria-pressed={isSelecionada}
      sx={{
        ...painelAderidoStyles.rifaButton,
        position: "relative",
        cursor: isSelecionada
          ? "pointer"
          : config.abreDetalhes
            ? "help"
            : config.selecionavel
              ? "pointer"
              : "default",
        ...montarEstiloRifa(rifa, isSelecionada, podeClicar),
        // Aceleração de hardware
        willChange: "transform, opacity",
      }}
    >
      {temCorrecaoPendente && (
        <Box
          data-testid={`rifa-${rifa.numero}-alerta-correcao`}
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#D97706",
            boxShadow: "0 0 0 2px #FFF4D8",
          }}
        />
      )}
      {config.abreDetalhes && (
        <InfoOutlinedIcon
          data-testid={`rifa-${rifa.numero}-detalhes-icon`}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            fontSize: 15,
            color: colors.verdeEscuro,
          }}
        />
      )}
      {rifa.numero}
    </ButtonBase>
  );

  const comTooltip = tooltip ? (
    <Tooltip title={tooltip} arrow>
      {botaoRifa}
    </Tooltip>
  ) : (
    botaoRifa
  );

  const conteudo = (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {comTooltip}
    </div>
  );

  if (!animar) {
    return conteudo;
  }

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", justifyContent: "center" }}>
      {comTooltip}
    </motion.div>
  );
});

/**
 * Grelha de rifas otimizada com renderização de cartões interativos.
 * Permite selecionar rifas disponíveis e desmarcá-las com clique direto.
 *
 * @param {GrelhaRifasProps} props - Propriedades do componente.
 * @returns {JSX.Element} Visualização em grid das rifas.
 */
export function GrelhaRifas({
  rifas,
  selecionadas,
  onToggleSelecao,
  onAbrirDetalhes,
}: GrelhaRifasProps) {
  const reduzirMovimento = useMediaQuery("(prefers-reduced-motion: reduce)");
  const selecionadasSet = React.useMemo(
    () => new Set(selecionadas),
    [selecionadas],
  );
  const animarLista = rifas.length <= 300 && !reduzirMovimento;

  if (rifas.length === 0) {
    return <EmptyRifasState />;
  }

  const rifasRenderizadas = rifas.map((rifa) => (
    <RifaItem
      key={rifa.numero}
      rifa={rifa}
      isSelecionada={selecionadasSet.has(rifa.numero) && (rifa.status === "disponivel" || rifa.status === "reservado")}
      onToggleSelecao={onToggleSelecao}
      onAbrirDetalhes={onAbrirDetalhes}
      animar={animarLista}
    />
  ));

  return (
    <Box sx={painelAderidoStyles.gridRifasWrapper}>
      {animarLista ? (
        <Box
          component={motion.div}
          variants={gridVariants}
          initial="hidden"
          animate="show"
          sx={painelAderidoStyles.gridRifas}
        >
          {rifasRenderizadas}
        </Box>
      ) : (
        <Box sx={painelAderidoStyles.gridRifas}>
          {rifasRenderizadas}
        </Box>
      )}
    </Box>
  );
}
