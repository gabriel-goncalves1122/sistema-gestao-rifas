import { SxProps, Theme } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { aderidosMotion, reduceMotionSx } from "@/shared/tokens/motion";
import { typographyScale } from "@/shared/tokens/typography";

const focusVisibleSx = {
  "&:focus-visible": {
    outline: "4px solid rgba(6, 61, 49, 0.24)",
    outlineOffset: "2px",
  },
};

export const painelAderidoComponentStyles: Record<string, SxProps<Theme>> = {
  blocoVendasHeader: {
    mb: 2.25,
  },

  blocoVendasTituloLinha: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 1,
    mb: 0.9,
    pl: {
      xs: 0.25,
      sm: 0.5,
    },
  },

  blocoVendasTitulo: {
    ...typographyScale.pageTitle,
    color: colors.pretoEsverdeado,
    letterSpacing: 0,
  },

  blocoVendasContador: {
    height: 30,
    borderRadius: 2,
    bgcolor: colors.verdeClaro,
    color: colors.verdeEscuro,
    border: "1px solid rgba(6, 61, 49, 0.12)",
    fontWeight: 850,
    boxShadow: "0 6px 14px rgba(2, 27, 22, 0.045)",

    "& .MuiChip-label": {
      px: 1.2,
      fontSize: "0.78rem",
    },
  },

  blocoVendasDescricao: {
    ...typographyScale.bodyBase,
    color: "#536962",
    maxWidth: 520,
    pl: {
      xs: 0.25,
      sm: 0.5,
    },
  },

  filtrosContainer: {
    width: "100%",
    overflowX: "auto",
    pb: 1,
    mb: 2.5,
    gap: 1,
    scrollSnapType: "x mandatory",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },

  filtroChip: {
    height: 44,
    px: 0.8,
    borderRadius: 2,
    bgcolor: colors.branco,
    border: "1.5px solid rgba(6, 61, 49, 0.14)",
    color: colors.verdeEscuro,
    fontWeight: 800,
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
    scrollSnapAlign: "start",
    boxShadow: "0 4px 10px rgba(2, 27, 22, 0.035)",
    transition: `background-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, border-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, box-shadow ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}`,
    ...focusVisibleSx,
    ...reduceMotionSx,

    "& .MuiChip-label": {
      px: 1.55,
    },

    "&:hover": {
      bgcolor: colors.verdeClaro,
      borderColor: "rgba(6, 61, 49, 0.24)",
    },
  },

  gridRifasWrapper: {
    width: "100%",
    overflow: "visible",
    px: {
      xs: 0,
      sm: 0.25,
    },
    py: {
      xs: 0.25,
      sm: 0.5,
    },
    pr: {
      xs: 0,
      sm: 0,
    },
  },

  gridRifas: {
    display: "grid",
    gridTemplateColumns: {
      xs: "repeat(3, minmax(76px, 1fr))",
      sm: "repeat(auto-fill, minmax(86px, 1fr))",
      md: "repeat(auto-fill, minmax(92px, 1fr))",
    },
    gap: 1.5,
  },

  rifaButton: {
    minHeight: {
      xs: 56,
      sm: 56,
    },
    width: "100%",
    borderRadius: 2,
    px: {
      xs: 1,
      sm: 1.25,
    },
    border: "2px solid",
    fontWeight: 900,
    fontSize: {
      xs: "0.88rem",
      sm: "0.96rem",
    },
    lineHeight: 1,
    letterSpacing: "0.015em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    transition: `transform 140ms ${aderidosMotion.easing.easeOut}, box-shadow 140ms ${aderidosMotion.easing.easeOut}, background-color 140ms ${aderidosMotion.easing.easeOut}, border-color 140ms ${aderidosMotion.easing.easeOut}`,
    ...focusVisibleSx,
    ...reduceMotionSx,

    "&:active": {
      transform: "scale(0.92)",
    },

    "&.Mui-disabled": {
      opacity: 1,
    },
  },

  blocoVendasArea: {
    mt: {
      xs: 3.5,
      sm: 4,
    },
  },

  pendenciaAcao: {
    minHeight: 72,
    alignSelf: {
      xs: "stretch",
      sm: "start",
    },
    justifyContent: "space-between",
    borderRadius: 2,
    px: 1.6,
    py: 1.35,
    bgcolor: colors.alertaFundo,
    color: colors.alertaTextoForte,
    border: "1.5px solid rgba(184, 123, 0, 0.22)",
    textTransform: "none",
    boxShadow: "0 10px 22px rgba(107, 78, 0, 0.06)",
    transition: `background-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, border-color ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}, transform ${aderidosMotion.duration.standard} ${aderidosMotion.easing.easeOut}`,
    ...focusVisibleSx,
    ...reduceMotionSx,

    "&:hover": {
      bgcolor: "#FFF2C4",
      borderColor: "rgba(184, 123, 0, 0.34)",
      transform: "translateY(-1px)",
    },

    "& .MuiButton-endIcon": {
      ml: 1,
      color: "inherit",
    },
  },

  pendenciaAcaoIcone: {
    width: 34,
    height: 34,
    borderRadius: 1.6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "rgba(107, 78, 0, 0.10)",
    color: colors.alertaTextoForte,
    flexShrink: 0,
  },

  pendenciaAcaoTitulo: {
    color: colors.pretoEsverdeado,
    fontWeight: 900,
    fontSize: "0.95rem",
    lineHeight: 1.15,
  },

  pendenciaAcaoSubtitulo: {
    color: colors.alertaTextoForte,
    fontWeight: 750,
    fontSize: "0.78rem",
    lineHeight: 1.2,
    mt: 0.25,
  },

  pendenciaAcaoContador: {
    height: 28,
    minWidth: 28,
    borderRadius: 1.5,
    bgcolor: colors.branco,
    color: colors.alertaTextoForte,
    border: "1px solid rgba(107, 78, 0, 0.14)",
    fontWeight: 950,
    flexShrink: 0,

    "& .MuiChip-label": {
      px: 0.9,
      fontSize: "0.78rem",
    },
  },

  pendenciaOk: {
    minHeight: 48,
    alignSelf: {
      xs: "stretch",
      sm: "start",
    },
    display: "inline-flex",
    alignItems: "center",
    justifyContent: {
      xs: "flex-start",
      sm: "center",
    },
    gap: 0.8,
    px: 1.35,
    py: 1.1,
    borderRadius: 2,
    bgcolor: colors.verdeClaro,
    color: colors.verdeEscuro,
    border: "1px solid rgba(6, 61, 49, 0.10)",
  },

  pendenciaOkTexto: {
    color: colors.verdeEscuro,
    fontWeight: 850,
    fontSize: "0.9rem",
    lineHeight: 1.2,
  },

};
