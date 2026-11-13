import { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

interface TesourariaSectionHeaderProps {
  eyebrow: string;
  titulo: string;
  subtitulo: string;
  action?: ReactNode;
  compact?: boolean;
  /** Destaca o título em negrito itálico com maior ênfase visual. */
  destaqueItalico?: boolean;
}

export function TesourariaSectionHeader({
  eyebrow,
  titulo,
  subtitulo,
  action,
  compact = false,
  destaqueItalico = true,
}: TesourariaSectionHeaderProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      sx={{
        mb: compact ? { xs: 2, md: 2.5 } : { xs: 2.25, md: 3 },
        px: { xs: 1.25, sm: 0 },
        gap: 1.5,
      }}
    >
      <Stack
        spacing={0.65}
        sx={{
          pl: { xs: 1.35, md: 1.75 },
          borderLeft: {
            xs: "4px solid #0B7A61",
            md: "5px solid #0B7A61",
          },
          minWidth: 0,
          maxWidth: { xs: "100%", md: 720 },
        }}
      >
        <Typography
          sx={{
            color: "#0B7A61",
            fontSize: { xs: "0.7rem", md: "0.75rem" },
            fontWeight: 950,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            lineHeight: 1.2,
          }}
        >
          {eyebrow}
        </Typography>

        <Typography
          sx={{
            color: destaqueItalico ? "#063D31" : "#021B16",
            fontWeight: 950,
            fontStyle: destaqueItalico ? "italic" : "normal",
            letterSpacing: destaqueItalico ? "-0.02em" : undefined,
            fontSize: destaqueItalico
              ? {
                  xs: "1.55rem",
                  sm: "1.8rem",
                  md: compact ? "1.8rem" : "2rem",
                }
              : {
                  xs: "1.38rem",
                  sm: "1.55rem",
                  md: compact ? "1.58rem" : "1.72rem",
                },
            lineHeight: 1.08,
            overflowWrap: "anywhere",
          }}
        >
          {titulo}
        </Typography>

        <Typography
          sx={{
            color: "#526760",
            fontSize: { xs: "0.9rem", md: "1rem" },
            fontStyle: "italic",
            lineHeight: 1.35,
          }}
        >
          {subtitulo}
        </Typography>
      </Stack>

      {action}
    </Stack>
  );
}
