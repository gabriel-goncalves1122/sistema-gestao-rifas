import { colors } from "./colors";

export const components = {
  // ==========================================
  // Tipografia (Tokens que exigem cor também)
  // ==========================================
  pageTitle: {
    color: colors.pretoEsverdeado,
    fontWeight: 950,
    fontSize: { xs: "1.25rem", sm: "1.5rem" },
    letterSpacing: "-0.02em",
  },
  sectionTitle: {
    color: colors.verdeEscuro,
    fontWeight: 900,
  },

  // ==========================================
  // Inputs e Formulários
  // ==========================================
  searchField: {
    "& .MuiOutlinedInput-root": {
      bgcolor: "transparent",
      borderRadius: 2,
      fontFamily: "Inter, sans-serif",
      "& fieldset": {
        borderColor: "rgba(0, 0, 0, 0.12)",
      },
      "&:hover fieldset": {
        borderColor: "rgba(0, 0, 0, 0.24)",
      },
      "&.Mui-focused fieldset": {
        borderColor: colors.verdeEscuro,
      },
    },
  },
  formField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: colors.branco,
    },
  },
  selectField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: colors.branco,
    },
  },

  // ==========================================
  // Botões e Ações
  // ==========================================
  primaryAction: {
    borderRadius: 2,
    px: 2.5,
    fontWeight: 850,
  },
  secondaryAction: {
    borderRadius: 2,
    px: 2,
    fontWeight: 750,
  },
  botaoNovoPremio: {
    borderRadius: 2,
    fontWeight: 850,
    textTransform: "none" as const,
    bgcolor: colors.verdeEscuro,
    color: colors.branco,
    boxShadow: "0 4px 14px rgba(6, 61, 49, 0.18)",
    "&:hover": {
      bgcolor: colors.pretoEsverdeado,
    },
  },
  iconeEditar: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    zIndex: 10,
    bgcolor: "rgba(255, 255, 255, 0.95)",
    color: colors.verdeEscuro,
    border: "1px solid rgba(6, 61, 49, 0.16)",
    boxShadow: "0 4px 12px rgba(2, 27, 22, 0.12)",
    transition: "all 0.2s ease",
    "&:hover": {
      bgcolor: colors.verdeClaro,
      borderColor: "rgba(6, 61, 49, 0.32)",
      color: colors.verdeForte,
      transform: "scale(1.08)",
    },
  },
  focusRing: {
    "&:focus-visible": {
      outline: "3px solid",
      outlineColor: colors.verdeEscuro,
      outlineOffset: 2,
    },
  },

  // ==========================================
  // Alertas e Mensagens
  // ==========================================
  alertaWarning: {
    borderRadius: 2,
    bgcolor: colors.alertaSuave,
    color: colors.alertaTexto,
    "& .MuiAlert-icon": {
      color: colors.alertaTexto,
    },
  },
  alertaErro: {
    borderRadius: 2,
    bgcolor: colors.erroSuave,
    color: colors.erroTexto,
    "& .MuiAlert-icon": {
      color: colors.erroTexto,
    },
  },
  labelVerde: {
    display: "inline-flex",
    px: 1,
    py: 0.5,
    borderRadius: 2,
    bgcolor: colors.verdeClaro,
    color: colors.verdeEscuro,
    fontWeight: 950,
  },

  // ==========================================
  // Tabelas
  // ==========================================
  tabelaCabecalho: {
    bgcolor: colors.fundoSuave,
    "& th": {
      color: colors.cinzaTexto,
      fontWeight: 900,
      fontSize: "0.72rem",
      textTransform: "uppercase" as const,
      letterSpacing: "0.04em",
      py: 1.45,
      borderColor: "rgba(2, 27, 22, 0.08)",
    },
  },
  linhaTabela: {
    "& td": {
      borderColor: "rgba(2, 27, 22, 0.08)",
      verticalAlign: "middle" as const,
      py: 1.45,
    },
    "&:hover": {
      bgcolor: colors.fundoDialogActions,
    },
  },
} as const;
