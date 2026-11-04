import type { SxProps, Theme } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { aderidosMotion, reduceMotionSx } from "@/shared/tokens/motion";
import { typographyScale } from "@/shared/tokens/typography";

import { focusVisibleSx } from "./surfaceSharedStyles";

export const painelAderidoResumoSurfaceStyles: Record<string, SxProps<Theme>> = {
  resumoContainer: {
    mb: {
      xs: 3,
      sm: 3.5,
    },
  },

  aderidoHeader: {
    mb: {
      xs: 2.25,
      md: 3,
    },
    px: {
      xs: 1.25,
      sm: 0,
    },
    gap: 1.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  aderidoHeaderConteudo: {
    pl: {
      xs: 1.35,
      md: 1.75,
    },
    borderLeft: {
      xs: `4px solid ${colors.verdeForte}`,
      md: `5px solid ${colors.verdeForte}`,
    },
    minWidth: 0,
    maxWidth: {
      xs: "100%",
      md: 720,
    },
    gap: 0.65,
  },

  aderidoHeaderEyebrow: {
    color: colors.verdeForte,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: {
      xs: "0.7rem",
      md: "0.75rem",
    },
    lineHeight: 1.2,
  },

  aderidoHeaderTitulo: {
    color: colors.pretoEsverdeado,
    fontWeight: 900,
    letterSpacing: 0,
    lineHeight: 1.08,
    fontSize: {
      xs: "1.38rem",
      sm: "1.55rem",
      md: "1.72rem",
    },
    overflowWrap: "anywhere",
  },

  saudacaoTitulo: {
    ...typographyScale.pageTitle,
    color: "#061F18",
    letterSpacing: 0,
  },

  saudacaoSubtitulo: {
    ...typographyScale.bodyBase,
    color: "#425951",
    mt: 0.75,
    maxWidth: 520,
  },

  notificacaoButton: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: 2,
    bgcolor: colors.branco,
    color: colors.verdeEscuro,
    border: "1px solid rgba(6, 61, 49, 0.10)",
    boxShadow: "0 8px 24px rgba(2, 27, 22, 0.12)",
    transition: `background-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, border-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}`,
    ...focusVisibleSx,
    ...reduceMotionSx,

    "&:hover": {
      bgcolor: colors.verdeClaro,
      borderColor: "rgba(6, 61, 49, 0.20)",
    },
  },

  resumoCompactoCard: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
    },
    gap: {
      xs: 1.35,
      sm: 1.5,
    },
    alignItems: {
      xs: "stretch",
      sm: "start",
    },
    p: 0,
    borderRadius: {
      xs: 2,
      sm: 2.25,
    },
    bgcolor: "transparent",
    border: "none",
    boxShadow: "none",
  },

  resumoCompactoItem: {
    minWidth: 0,
    minHeight: 170,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 1.4,
    p: 3,
    borderRadius: {
      xs: 2,
      sm: 2.25,
    },
    bgcolor: colors.branco,
    border: "2px solid rgba(6, 61, 49, 0.10)",
    boxShadow:
      "0 18px 42px rgba(2, 27, 22, 0.075), 0 2px 8px rgba(6, 61, 49, 0.045)",
    overflow: "hidden",
    position: "relative",
    transition: `border-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, box-shadow ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, transform ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}`,
    ...reduceMotionSx,

    "&::after": {
      content: '""',
      position: "absolute",
      right: -24,
      top: -28,
      width: 96,
      height: 96,
      borderRadius: "50%",
      background: "rgba(234, 243, 239, 0.78)",
      pointerEvents: "none",
    },

    "&:hover": {
      borderColor: "rgba(6,61,49,0.20)",
      boxShadow:
        "0 22px 48px rgba(2,27,22,0.11), 0 4px 12px rgba(6,61,49,0.07)",
      transform: "translateY(-2px)",
    },
  },

  resumoDivisor: {
    display: "none",
  },

  resumoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: colors.verdeClaro,
    color: colors.verdeEscuro,
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },

  resumoIconBoxAlerta: {
    bgcolor: colors.alertaFundo,
    color: colors.alertaTextoForte,
  },

  resumoIconBoxOk: {
    bgcolor: "#EAF7EF",
    color: "#0B5136",
  },

  resumoCardLabel: {
    color: colors.verdeAccent,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: {
      xs: "0.68rem",
      sm: "0.72rem",
    },
    lineHeight: 1.25,
  },

  resumoCardValor: {
    ...typographyScale.cardValue,
    color: colors.verdeEscuro,
    letterSpacing: 0,
    whiteSpace: "nowrap",
  },

  resumoCardDescricao: {
    color: "#536962",
    lineHeight: 1.35,
    fontSize: {
      xs: "0.86rem",
      sm: "0.9rem",
    },
  },

  resumoMetaLinha: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },

  resumoConteudoLinha: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 0.65,
    position: "relative",
    zIndex: 1,
  },

  pendenciaBotao: {
    mt: 0.2,
    color: colors.alertaTextoForte,
    borderColor: "rgba(203, 166, 77, 0.55)",
    fontWeight: 800,
    textTransform: "none",
    borderRadius: 2,
    px: 1.8,
    py: 0.55,
    minHeight: 34,
    bgcolor: "rgba(255, 244, 216, 0.52)",
    ...focusVisibleSx,

    "&:hover": {
      borderColor: "#A88123",
      bgcolor: colors.alertaFundo,
    },
  },
};
