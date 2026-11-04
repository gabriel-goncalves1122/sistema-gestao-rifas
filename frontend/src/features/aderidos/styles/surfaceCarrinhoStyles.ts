import type { SxProps, Theme } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { aderidosMotion, reduceMotionSx } from "@/shared/tokens/motion";

import { focusVisibleSx } from "./surfaceSharedStyles";

export const painelAderidoCarrinhoSurfaceStyles: Record<
  string,
  SxProps<Theme>
> = {
  carrinhoFixoArea: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1200,
    maxHeight: "100dvh",
    px: {
      xs: 2,
      sm: 3,
    },
    pt: 2,
    pb: {
      xs: "calc(env(safe-area-inset-bottom) + 14px)",
      sm: 2.5,
    },
    bgcolor: "transparent",
    pointerEvents: "none",
  },

  carrinhoAnimado: {
    opacity: 1,
    transform: "translateY(0)",
    transition: `opacity ${aderidosMotion.duration.medium} ${aderidosMotion.easing.easeOut}, transform ${aderidosMotion.duration.medium} ${aderidosMotion.easing.easeOut}`,
    ...reduceMotionSx,
  },

  carrinhoFixoCard: {
    width: "100%",
    maxWidth: 760,
    mx: "auto",
    p: {
      xs: 1.25,
      sm: 1.5,
    },
    borderRadius: {
      xs: 2,
      sm: 2.25,
    },
    bgcolor: "rgba(255, 255, 255, 0.90)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "2px solid rgba(6,61,49,0.16)",
    boxShadow:
      "0 20px 48px rgba(2, 27, 22, 0.16), 0 4px 12px rgba(6, 61, 49, 0.08)",
    pointerEvents: "auto",
  },

  carrinhoFixoConteudo: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr auto",
      sm: "1fr auto",
    },
    alignItems: "center",
    gap: {
      xs: 1.25,
      sm: 2,
    },
  },

  carrinhoResumoArea: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: {
      xs: 1.15,
      sm: 1.35,
    },
  },

  carrinhoQuantidadeChip: {
    width: {
      xs: 44,
      sm: 48,
    },
    height: {
      xs: 44,
      sm: 48,
    },
    flexShrink: 0,
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: colors.verdeEscuro,
    color: colors.branco,
    fontWeight: 950,
    fontSize: {
      xs: "1rem",
      sm: "1.08rem",
    },
    boxShadow: "0 8px 18px rgba(6, 61, 49, 0.20)",
  },

  carrinhoTextoArea: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  carrinhoFixoTitulo: {
    color: colors.cinzaTexto,
    fontWeight: 800,
    lineHeight: 1.15,
    fontSize: {
      xs: "0.86rem",
      sm: "0.95rem",
    },
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  carrinhoFixoDescricao: {
    mt: 0.15,
    color: colors.pretoEsverdeado,
    fontWeight: 950,
    letterSpacing: 0,
    fontSize: {
      xs: "1.45rem",
      sm: "1.7rem",
    },
    lineHeight: 1.05,
    whiteSpace: "nowrap",
  },

  carrinhoFixoBotao: {
    minHeight: {
      xs: 52,
      sm: 54,
    },
    minWidth: {
      xs: 124,
      sm: 170,
    },
    borderRadius: 2,
    px: {
      xs: 1.7,
      sm: 2.6,
    },
    bgcolor: colors.verdeEscuro,
    color: colors.branco,
    fontWeight: 950,
    fontSize: {
      xs: "0.95rem",
      sm: "1rem",
    },
    textTransform: "none",
    boxShadow: "0 10px 22px rgba(6, 61, 49, 0.20)",
    transition: `transform ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, box-shadow ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, background-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}`,
    ...focusVisibleSx,
    ...reduceMotionSx,

    "& .MuiButton-startIcon": {
      mr: {
        xs: 0.7,
        sm: 1,
      },
    },

    "&:hover": {
      bgcolor: colors.pretoEsverdeado,
      boxShadow: "0 14px 28px rgba(6, 61, 49, 0.28)",
      transform: "translateY(-1px)",
    },

    "&:active": {
      transform: "translateY(0)",
    },
  },
};
