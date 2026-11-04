// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/GrelhaRifas.tsx
// ============================================================================
import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, ButtonBase, Tooltip, useMediaQuery } from "@mui/material";
import { motion } from "framer-motion";

import { colors } from "@/shared/tokens/colors";
import { painelAderidoStyles } from "../styles/painelAderidoStyles";
import { RifaAderido } from "../types/painelAderido";
import { obterConfigStatusRifa } from "../utils/rifasStatus";
import { EmptyRifasState } from "./EmptyRifasState";

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

/**
 * Monta o estilo visual do cartão/botão da rifa com base em seu status de negócio e seleção.
 *
 * @param {RifaAderido} rifa - Entidade da rifa com status e metadados.
 * @param {boolean} isSelecionada - Indica se a rifa está selecionada no carrinho.
 * @param {boolean} podeClicar - Indica se o botão aceita interação do usuário.
 * @returns {object} Estilos SX para o MUI.
 */
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
      // Anel de brilho esmeralda suave concêntrico
      boxShadow:
        "0 0 0 2px #FFFFFF, 0 0 0 4px #063D31, 0 12px 24px rgba(6, 61, 49, 0.22)",

      "&:hover": {
        bgcolor: colors.pretoEsverdeado,
        borderColor: colors.pretoEsverdeado,
        transform: "translateY(-1px)",
        boxShadow:
          "0 0 0 2px #FFFFFF, 0 0 0 4px #021B16, 0 16px 28px rgba(6, 61, 49, 0.28)",
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

interface RifaItemProps {
  rifa: RifaAderido;
  isSelecionada: boolean;
  onToggleSelecao: (numero: string, status: string) => void;
  onAbrirDetalhes: (rifa: RifaAderido) => void;
  animarLayout: boolean;
}

const RifaItem = React.memo(
  React.forwardRef<HTMLDivElement, RifaItemProps>(function RifaItem(
    { rifa, isSelecionada, onToggleSelecao, onAbrirDetalhes, animarLayout },
    ref,
  ) {
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

    if (!animarLayout) {
      return (
        <div ref={ref} style={{ display: "flex", justifyContent: "center" }}>
          {comTooltip}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        layout="position"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          layout: { type: "spring", stiffness: 380, damping: 28 },
          opacity: { duration: 0.15 },
          scale: { duration: 0.15 },
        }}
        style={{ display: "flex", justifyContent: "center" }}
      >
        {comTooltip}
      </motion.div>
    );
  }),
);

/**
 * Grelha de rifas otimizada com reorganização orgânica de posições (FLIP) acelerada por hardware.
 * Permite selecionar rifas disponíveis e desmarcá-las com clique direto e animações fluidas ao alternar filtros.
 *
 * @param {GrelhaRifasProps} props - Propriedades do componente.
 * @returns {JSX.Element} Visualização em grid das rifas com animação orgânica.
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

  if (rifas.length === 0) {
    return <EmptyRifasState />;
  }

  const animarLayout = rifas.length <= 150 && !reduzirMovimento;

  const rifasRenderizadas = rifas.map((rifa) => (
    <RifaItem
      key={rifa.numero}
      rifa={rifa}
      isSelecionada={
        selecionadasSet.has(rifa.numero) &&
        (rifa.status === "disponivel" || rifa.status === "reservado")
      }
      onToggleSelecao={onToggleSelecao}
      onAbrirDetalhes={onAbrirDetalhes}
      animarLayout={animarLayout}
    />
  ));

  return (
    <Box sx={painelAderidoStyles.gridRifasWrapper}>
      <Box
        component={motion.div}
        layout={animarLayout ? "position" : false}
        sx={painelAderidoStyles.gridRifas}
      >
        {rifasRenderizadas}
      </Box>
    </Box>
  );
}
