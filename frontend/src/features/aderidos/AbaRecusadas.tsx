// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/AbaRecusadas.tsx
// ============================================================================
import { useEffect, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { CardVendaRecusada } from "./components/recusadas/CardVendaRecusada";
import { DialogConfirmarDesistencia } from "./components/recusadas/DialogConfirmarDesistencia";
import type { GrupoRifasRecusadas } from "./types/painelAderido";

/**
 * Propriedades da aba de listagem e correção de vendas recusadas do aderido.
 */
export interface AbaRecusadasProps {
  /** Lista de grupos de vendas recusadas ou com correção cadastral pendente. */
  gruposRecusados: GrupoRifasRecusadas[];
  /** Callback para retornar à visualização principal de rifas. */
  onVoltar: () => void;
  /** Callback acionado ao clicar para corrigir dados de uma venda recusada. */
  onAbrirCorrecao: (grupo: GrupoRifasRecusadas) => void;
  /** Callback opcional acionado para liberar bilhetes desistindo da venda recusada. */
  onDesistirVenda?: (numerosRifas: string[]) => Promise<boolean | void> | void;
}

/**
 * Renderiza a visão de vendas recusadas permitindo corrigir os dados do comprador
 * ou liberar as rifas de volta para venda mediante confirmação.
 *
 * @param {AbaRecusadasProps} props - Grupos recusados e handlers de navegação e ação.
 * @returns {JSX.Element} Grade de cartões de vendas recusadas e diálogo de confirmação.
 */
export function AbaRecusadas({
  gruposRecusados,
  onVoltar,
  onAbrirCorrecao,
  onDesistirVenda,
}: AbaRecusadasProps) {
  const inicioRef = useRef<HTMLDivElement | null>(null);
  const [grupoParaDesistir, setGrupoParaDesistir] =
    useState<GrupoRifasRecusadas | null>(null);
  const [desistindo, setDesistindo] = useState(false);

  useEffect(() => {
    inicioRef.current?.focus();
  }, []);

  const handleConfirmarDesistencia = async () => {
    if (!grupoParaDesistir || !onDesistirVenda) return;
    setDesistindo(true);
    try {
      await onDesistirVenda(grupoParaDesistir.bilhetes);
      setGrupoParaDesistir(null);
    } finally {
      setDesistindo(false);
    }
  };

  return (
    <Box ref={inicioRef} tabIndex={-1} sx={{ outline: "none" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        gap={2}
        sx={{ mb: 3.5 }}
      >
        <Stack
          sx={{
            pl: { xs: 1.35, md: 1.75 },
            borderLeft: {
              xs: `4px solid ${colors.verdeMedio}`,
              md: `5px solid ${colors.verdeMedio}`,
            },
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
          <CardVendaRecusada
            key={idx}
            grupo={grupo}
            onAbrirCorrecao={onAbrirCorrecao}
            onSolicitarDesistencia={
              onDesistirVenda ? setGrupoParaDesistir : undefined
            }
          />
        ))}
      </Box>

      <DialogConfirmarDesistencia
        grupo={grupoParaDesistir}
        desistindo={desistindo}
        onClose={() => setGrupoParaDesistir(null)}
        onConfirmar={handleConfirmarDesistencia}
      />
    </Box>
  );
}
