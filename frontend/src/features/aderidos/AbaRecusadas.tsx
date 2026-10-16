// ============================================================================
// ARQUIVO: frontend/src/views/components/aderidos/AbaRecusadas.tsx
// ============================================================================
import { useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReportGmailerrorredIcon from "@mui/icons-material/ReportGmailerrorred";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";

import { GrupoRifasRecusadas } from "./types/painelAderido";
import { formatarDataCurta } from "@/shared/utils/formatadores";
import { colors } from "@/shared/tokens/colors";

interface AbaRecusadasProps {
  gruposRecusados: GrupoRifasRecusadas[];
  onVoltar: () => void;
  onAbrirCorrecao: (grupo: GrupoRifasRecusadas) => void;
}

export function AbaRecusadas({
  gruposRecusados,
  onVoltar,
  onAbrirCorrecao,
}: AbaRecusadasProps) {
  const inicioRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inicioRef.current?.focus();
  }, []);

  return (
    <Box ref={inicioRef} tabIndex={-1} sx={{ outline: "none" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        gap={2}
        sx={{
          mb: 3.5,
        }}
      >
        <Stack
          sx={{
            pl: { xs: 1.35, md: 1.75 },
            borderLeft: { xs: `4px solid ${colors.verdeMedio}`, md: `5px solid ${colors.verdeMedio}` },
            gap: 0.65,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              color: colors.verdeMedio,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: { xs: "0.7rem", md: "0.75rem" },
              lineHeight: 1.2,
            }}
          >
            Correção de dados
          </Typography>

          <Typography
            component="h1"
            sx={{
              color: colors.pretoEsverdeado,
              fontWeight: 950,
              letterSpacing: 0,
              lineHeight: 1.08,
              fontSize: { xs: "1.38rem", sm: "1.55rem", md: "1.72rem" },
            }}
          >
            Vendas recusadas
          </Typography>

          <Typography
            sx={{
              color: colors.cinzaTexto,
              fontWeight: 650,
              lineHeight: 1.45,
              maxWidth: 560,
              fontSize: { xs: "0.92rem", sm: "0.98rem" },
            }}
          >
            Corrija os dados apontados para devolver a venda à análise.
          </Typography>
        </Stack>

        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={onVoltar}
          sx={{
            alignSelf: { xs: "flex-start", sm: "center" },
            color: colors.verdeEscuro,
            fontWeight: 850,
            textTransform: "none",
            borderRadius: 2,
            px: 1.25,
            "&:hover": {
              bgcolor: colors.verdeClaro,
            },
          }}
        >
          Voltar às rifas
        </Button>
      </Stack>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
        gap={3}
      >
        {gruposRecusados.map((grupo, idx) => (
          <Paper
            elevation={0}
            key={idx}
            sx={{
              p: { xs: 2, sm: 2.35 },
              borderRadius: 2.25,
              bgcolor: colors.branco,
              border: `1px solid ${colors.borda}`,
              boxShadow:
                "0 18px 42px rgba(2, 27, 22, 0.075), 0 2px 8px rgba(6, 61, 49, 0.045)",
            }}
          >
            <Stack spacing={2.15}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                gap={1.5}
              >
                <Box sx={{ minWidth: 0 }}>
                  {grupo.apenasCorrecaoCadastro && (
                    <Chip
                      size="small"
                      label="Correção de cadastro (Pagamento aprovado)"
                      sx={{
                        mb: 0.75,
                        height: 24,
                        borderRadius: 1.25,
                        bgcolor: "#EAF7EF",
                        color: "#0B5136",
                        border: "1px solid #85C89F",
                        fontWeight: 850,
                        fontSize: "0.72rem",
                      }}
                    />
                  )}

                  <Typography
                    sx={{
                      color: colors.pretoEsverdeado,
                      fontWeight: 900,
                      fontSize: "1rem",
                      lineHeight: 1.18,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {grupo.comprador}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      color: colors.cinzaTexto,
                      fontWeight: 700,
                      fontSize: "0.78rem",
                    }}
                  >
                    {formatarDataCurta(grupo.data)}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={
                    grupo.bilhetes.length === 1
                      ? "1 rifa"
                      : `${grupo.bilhetes.length} rifas`
                  }
                  sx={{
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: colors.verdeClaro,
                    color: colors.verdeEscuro,
                    border: "1px solid rgba(6, 61, 49, 0.12)",
                    fontWeight: 850,
                  }}
                />
              </Stack>

              <Box
                sx={{
                  p: 1.35,
                  borderRadius: 2,
                  bgcolor: colors.alertaSuave,
                  border: "1px solid rgba(107, 78, 0, 0.12)",
                }}
              >
                <Stack direction="row" gap={1} alignItems="flex-start">
                  <ReportGmailerrorredIcon
                    fontSize="small"
                    sx={{ color: colors.alertaTexto, mt: 0.1 }}
                  />
                  <Box>
                    <Typography
                      sx={{
                        color: colors.alertaTexto,
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Motivo
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.35,
                        color: colors.alertaTextoForte,
                        fontWeight: 750,
                        fontSize: "0.9rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {grupo.motivo}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: colors.cinzaTexto,
                    fontWeight: 850,
                    fontSize: "0.78rem",
                    mb: 0.85,
                  }}
                >
                  Rifas para revisar
                </Typography>

                <Stack direction="row" gap={0.65} flexWrap="wrap">
                  {grupo.bilhetes.map((b) => (
                    <Chip
                      key={b}
                      size="small"
                      label={b}
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: colors.erroSuave,
                        color: colors.erroTexto,
                        border: `1px solid ${colors.erroBorda}`,
                        fontWeight: 850,
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={<BuildCircleIcon />}
                onClick={() => onAbrirCorrecao(grupo)}
                sx={{
                  minHeight: 44,
                  borderRadius: 2,
                  bgcolor: colors.verdeEscuro,
                  fontWeight: 900,
                  "&:hover": {
                    bgcolor: colors.pretoEsverdeado,
                  },
                }}
              >
                Corrigir dados
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
