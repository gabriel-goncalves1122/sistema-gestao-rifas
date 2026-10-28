import { Box, Chip, Stack } from "@mui/material";

import {
  ConfigFiltroPix,
  FILTROS_PIX,
  PixTransacoesFiltrosProps,
} from "./pixTransacoesFiltrosTypes";

interface PixTransacoesFiltrosChipsProps extends PixTransacoesFiltrosProps {
  marginTop?: number;
}

function estiloChip(config: ConfigFiltroPix, ativo: boolean) {
  if (ativo) {
    return {
      height: 34,
      borderRadius: 999,
      fontWeight: 850,
      px: 0.5,
      bgcolor: config.corAtiva.bg,
      color: config.corAtiva.text,
      border: `1px solid ${config.corAtiva.border}`,
      boxShadow: "0 2px 8px rgba(2, 27, 22, 0.08)",
      "&:hover": {
        bgcolor: config.corAtiva.bg,
        opacity: 0.94,
      },
    };
  }

  return {
    height: 34,
    borderRadius: 999,
    fontWeight: 700,
    px: 0.5,
    bgcolor: "#FFFFFF",
    color: "#526760",
    border: "1px solid rgba(2, 27, 22, 0.12)",
    "&:hover": {
      bgcolor: "#F6F9F8",
      color: "#021B16",
      borderColor: "rgba(2, 27, 22, 0.22)",
    },
  };
}

/**
 * Renderiza o carrossel de chips rápidos de filtro por status bancário/validação da Tesouraria Pix,
 * com badges numéricos de contagem e cores semânticas ativas.
 */
export function PixTransacoesFiltrosChips({
  filtros,
  onChangeFiltros,
  contagens,
  marginTop = 1.25,
}: PixTransacoesFiltrosChipsProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      flexWrap="nowrap"
      useFlexGap
      sx={{
        mt: marginTop,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        WebkitOverflowScrolling: "touch",
        scrollSnapType: "x proximity",
        py: 0.25,
        "&::-webkit-scrollbar": {
          display: "none",
        },
      }}
    >
      {FILTROS_PIX.map((filtro) => {
        const ativo = filtros.status === filtro.value;
        const contagem = contagens?.[filtro.value];

        return (
          <Chip
            key={filtro.value}
            label={
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <span>{filtro.label}</span>
                {contagem !== undefined && (
                  <Box
                    component="span"
                    sx={{
                      px: 0.75,
                      py: 0.15,
                      borderRadius: 999,
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      bgcolor: ativo
                        ? filtro.corAtiva.badgeBg
                        : "rgba(2, 27, 22, 0.07)",
                      color: ativo ? filtro.corAtiva.badgeText : "#526760",
                    }}
                  >
                    {contagem}
                  </Box>
                )}
              </Box>
            }
            clickable
            onClick={() =>
              onChangeFiltros({
                ...filtros,
                status: filtro.value,
              })
            }
            sx={{
              ...estiloChip(filtro, ativo),
              flexShrink: 0,
              scrollSnapAlign: "start",
            }}
          />
        );
      })}
    </Stack>
  );
}
