import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";

import { CargoChip } from "../shared/CargoChip";
import { StatusChip } from "../shared/StatusChip";
import { ModalidadeChip } from "../shared/ModalidadeChip";
import type { AderidoSecretaria } from "@/shared/types/secretaria";
import { surfaces } from "@/shared/tokens/surfaces";

const STATUS_DOT: Record<string, string> = {
  ativo: "#2e7d32",
  pendente: "#ed6c02",
  inativo: "#9e9e9e",
};

interface SecretariaMobileSwipeableCardProps {
  aderido: AderidoSecretaria;
  onSelecionar: (aderido: AderidoSecretaria) => void;
}

export function SecretariaMobileSwipeableCard({
  aderido,
  onSelecionar,
}: SecretariaMobileSwipeableCardProps) {
  const nomeAderido = aderido.nome || "Não definido";
  const temFaixa =
    aderido.faixa_rifas?.inicio && aderido.faixa_rifas?.fim;
  const statusCor =
    STATUS_DOT[aderido.status_cadastro] || "#9e9e9e";

  return (
    <Card
      variant="outlined"
      sx={{
        ...surfaces.card,
        overflow: "hidden",
        borderLeft: `4px solid ${statusCor}`,
      }}
    >
      <CardActionArea
        aria-label={`Abrir detalhes de ${nomeAderido}`}
        onClick={() => onSelecionar(aderido)}
        sx={{
          cursor: "pointer",
          "&:focus-visible": {
            outline: "3px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
        }}
      >
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ position: "relative", mt: 0.5 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor:
                    aderido.status_cadastro === "ativo"
                      ? "primary.main"
                      : "grey.400",
                }}
              >
                {aderido.nome ? aderido.nome.charAt(0).toUpperCase() : "?"}
              </Avatar>
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  bgcolor: statusCor,
                }}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                fontWeight={700}
                noWrap
                sx={{ fontFamily: "Inter, sans-serif" }}
              >
                {nomeAderido}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                display="block"
                sx={{ mb: 0.75, fontFamily: "Inter, sans-serif" }}
              >
                {aderido.email}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <StatusChip status={aderido.status_cadastro} />
                <ModalidadeChip modalidade={aderido.modalidade_adesao} />
                <CargoChip cargo={aderido.cargo} />

                {temFaixa && (
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={
                      <ConfirmationNumberIcon
                        sx={{ fontSize: "14px !important" }}
                      />
                    }
                    label={`#${aderido.faixa_rifas?.inicio}–${aderido.faixa_rifas?.fim}`}
                    sx={{
                      height: 24,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      borderColor: "divider",
                      bgcolor: "action.hover",
                    }}
                  />
                )}
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
